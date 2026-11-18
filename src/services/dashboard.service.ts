import { DoctorModel } from '../models/Doctor';
import { PatientModel } from '../models/Patient';

type MonthCount = { period: string; count: number };

const startOfMonthUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

// fill empty months with 0
function fillMonths(from: Date, to: Date, rows: MonthCount[]): MonthCount[] {
  const counts = new Map(rows.map((r) => [r.period, r.count]));
  const out: MonthCount[] = [];
  for (let d = startOfMonthUTC(from); d <= to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const period = monthKey(d);
    out.push({ period, count: counts.get(period) ?? 0 });
  }
  return out;
}

// default: last 12 months incl. this one
export function resolveRange(from?: string, to?: string) {
  const now = new Date();
  const end = to ? new Date(`${to}T23:59:59.999Z`) : now;
  const start = from
    ? new Date(`${from}T00:00:00.000Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  return { start, end };
}

const byMonth = (field: string) => [
  { $group: { _id: { $dateToString: { format: '%Y-%m', date: `$${field}` } }, count: { $sum: 1 } } },
  { $project: { _id: 0, period: '$_id', count: 1 } },
];

export async function getStats(from?: string, to?: string) {
  const { start, end } = resolveRange(from, to);
  const monthStart = startOfMonthUTC(new Date());

  const [totalPatients, totalDoctors, newPatientsThisMonth, [patientFacets], [doctorFacets]] = await Promise.all([
    PatientModel.estimatedDocumentCount(),
    DoctorModel.estimatedDocumentCount(),
    PatientModel.countDocuments({ admissionDate: { $gte: monthStart } }),

    // $match first so it can use the admissionDate index
    PatientModel.aggregate<{
      inRange: { count: number }[];
      overTime: MonthCount[];
      perDoctor: { doctorId: string; count: number }[];
      conditions: { condition: string; count: number }[];
      statuses: { status: string; count: number }[];
      genders: { gender: string; count: number }[];
    }>([
      { $match: { admissionDate: { $gte: start, $lte: end } } },
      {
        $facet: {
          inRange: [{ $count: 'count' }],
          overTime: byMonth('admissionDate'),
          perDoctor: [
            { $group: { _id: '$doctor', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 10 },
            { $project: { _id: 0, doctorId: '$_id', count: 1 } },
          ],
          conditions: [
            { $group: { _id: '$condition', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, condition: '$_id', count: 1 } },
          ],
          statuses: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
          ],
          genders: [
            { $group: { _id: '$gender', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, gender: '$_id', count: 1 } },
          ],
        },
      },
    ]),

    DoctorModel.aggregate<{
      overTime: MonthCount[];
      specializations: { specialization: string; doctors: number; patients: number }[];
    }>([
      {
        $facet: {
          overTime: [{ $match: { createdAt: { $gte: start, $lte: end } } }, ...byMonth('createdAt')],
          // no join needed, patientCount is on the doctor
          specializations: [
            { $group: { _id: '$specialization', doctors: { $sum: 1 }, patients: { $sum: '$patientCount' } } },
            { $sort: { patients: -1, _id: 1 } },
            { $project: { _id: 0, specialization: '$_id', doctors: 1, patients: 1 } },
          ],
        },
      },
    ]),
  ]);

  // only need names for the top 10
  const topIds = patientFacets.perDoctor.map((p) => p.doctorId);
  const topDoctors = await DoctorModel.find({ _id: { $in: topIds } }).select('name specialization').lean();
  const doctorById = new Map(topDoctors.map((d) => [String(d._id), d]));

  const patientsPerDoctor = patientFacets.perDoctor
    .map((p) => {
      const d = doctorById.get(String(p.doctorId));
      return d ? { doctorId: String(p.doctorId), name: d.name, specialization: d.specialization, count: p.count } : null;
    })
    .filter((x) => x !== null);

  return {
    totals: {
      doctors: totalDoctors,
      patients: totalPatients,
      patientsInRange: patientFacets.inRange[0]?.count ?? 0,
      newPatientsThisMonth,
      avgPatientsPerDoctor: totalDoctors ? Math.round((totalPatients / totalDoctors) * 10) / 10 : 0,
    },
    patientsPerDoctor,
    patientsOverTime: fillMonths(start, end, patientFacets.overTime),
    doctorsOverTime: fillMonths(start, end, doctorFacets.overTime),
    conditionBreakdown: patientFacets.conditions,
    statusBreakdown: patientFacets.statuses,
    specializationBreakdown: doctorFacets.specializations,
    genderBreakdown: patientFacets.genders,
    range: { from: start.toISOString(), to: end.toISOString() },
  };
}
