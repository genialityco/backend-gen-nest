const mongoose = require('mongoose');
require('dotenv').config();
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection;
  const oid = s => new mongoose.Types.ObjectId(s);
  const id = '68d2beb784b2d581f00cc997';

  console.log('== ¿Qué es', id, '? ==');
  const asUser = await db.collection('users').findOne({ _id: oid(id) });
  const asMember = await db.collection('members').findOne({ _id: oid(id) });
  const asAttendee = await db.collection('attendees').findOne({ _id: oid(id) });
  console.log('user?', !!asUser, '| member?', !!asMember, '| attendee?', !!asAttendee);
  if (asUser) console.log('  user.email:', asUser.email, '| firebaseUid:', asUser.firebaseUid);

  console.log('\n== Attendees donde userId =', id, '==');
  const byUser = await db.collection('attendees').find({ userId: oid(id) }).toArray();
  for (const a of byUser) {
    const ev = await db.collection('events').findOne({ _id: a.eventId });
    console.log(`  attendee _id=${a._id} | evento="${ev?.name?.slice(0,45)}" | downloads=${a.certificateDownloads ?? 0} | attended=${a.attended} | horas=${a.certificationHours}`);
  }
  console.log('Total attendees por userId:', byUser.length);
  await mongoose.disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
