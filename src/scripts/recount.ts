// repair tool: npm run recount
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { recountPatientCounts } from '../services/doctor.service';

connectDB()
  .then(recountPatientCounts)
  .then((r) => console.log(`patientCount rebuilt (${r.doctorsWithPatients} doctors with patients, ${r.updated} fixed)`))
  .catch((err) => {
    console.error('recount failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
