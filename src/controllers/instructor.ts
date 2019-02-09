import * as express from 'express';

// TypeORM setup
import { getMongoManager, getMongoRepository } from 'typeorm';
import { Assignment } from '../entity/Assignment';
import { Cohort } from '../entity/Cohort';
import { Deliverable } from '../entity/Deliverable';
import { User } from '../entity/User';

const assignmentRepository = getMongoRepository(Assignment);
const cohortRepository = getMongoRepository(Cohort);
const deliverableRepository = getMongoRepository(Deliverable);
const usersRepository = getMongoRepository(User);

const manager = getMongoManager();

// Express setup
const router = express.Router();

// Load passport config
// tslint:disable-next-line:no-var-requires
const passportService = require('../services/passport');
import passport = require('passport');

// Auth strategies
const requireAuth = passport.authenticate('jwt', { session: false });

/*************************************** */
//             Controllers
/*************************************** */

// Assignments: Instructor can CRUD assignments to turn into deliverables

router.get('/', requireAuth, (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not a instructor' });
  }
  return res.send({ user: req.user });
});

router.post('/assignments', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not a instructor' });
  }
  try {
    const incoming = req.body;

    const assignment = new Assignment();

    if (incoming.cohortType) {
      assignment.cohortType = incoming.cohortType;
    }
    if (incoming.cohortWeek) {
      assignment.cohortWeek = incoming.cohortWeek;
    }
    if (incoming.instructions) {
      assignment.instructions = incoming.instructions;
    }
    if (incoming.instructor) {
      assignment.instructor = incoming.instructor;
    }
    if (incoming.name) {
      assignment.name = incoming.name;
    }
    if (incoming.resourcesUrls) {
      assignment.resourcesUrls = incoming.resourcesUrls;
    }
    if (incoming.topics) {
      assignment.topics = incoming.topics;
    }
    assignment.version = 1;

    const createdAssignment = await assignmentRepository.create(assignment);
    const savedAssignment = await manager.save(createdAssignment);
    const mintedAssignment = await assignmentRepository.findOne(
      savedAssignment,
    );

    console.log('At the instructors assignments POST route', req.user._id);
    res.send({
      message: 'At the instructors assignments POST route',
      assignment: mintedAssignment,
      incoming,
    });
  } catch (error) {
    console.log('Error with the instructor/assignments/ POST route', error);
    return res.send({ error: 'error' });
  }
});

router.get('/assignments', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not a instructor' });
  }
  try {
    //
    console.log('At the instructors assignments GET route', req.user._id);

    const assignments = await assignmentRepository.find();
    res.send({ assignments });
  } catch (error) {
    console.log('Error with the instructor/assignments/ GET route', error);
    return res.send({ error: 'error' });
  }
});

router.put('/assignments/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not a instructor' });
  }
  try {
    console.log('At the instructors assignments PUT route', req.user._id);

    const toEditAssignment = await assignmentRepository.findOne(req.params.id);

    const editedAssignment = editAssignment(toEditAssignment, req.body);

    const updatedAssignment = await assignmentRepository.updateOne(
      toEditAssignment,
      {
        $set: editedAssignment,
      },
    );

    return res.send({
      edited: updatedAssignment,
    });
  } catch (error) {
    console.log('Error with the instructor/assignments/ PUT route', error);
    return res.send({ error: 'error' });
  }
});

router.delete('/assignments/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not a instructor' });
  }
  try {
    console.log(`DELETE assignment ${req.params.id}`);
    // TODO: Should any teacher be able to delete an assignment?

    const assignment = await assignmentRepository.findOne(req.params.id);
    const deletedAssignment = await assignmentRepository.findOneAndDelete(
      assignment,
    );

    return res.send({ deleted: deletedAssignment });
  } catch (error) {
    console.log('Error with the instructor/assignments/ DELETE route', error);
    return res.send({ error: 'error' });
  }
});

// Instructor can send an assignment to cohort as deliverable
router.get('/cohorts', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not a instructor' });
  }

  try {
    console.log('At the instructors cohorts POST route', req.user._id);
    const cohorts = await cohortRepository.find({ instructors: req.user._id });
    // const cohorts = await cohortRepository.find();

    return res.send({ cohorts });
  } catch (error) {
    console.log('Error with the instructor/cohorts/ POST route', error);
    return res.send({ error: 'error' });
  }
});

router.post('/cohorts/:id', requireAuth, async (req, res) => {
  //
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not a instructor' });
  }
  try {
    // See note from Parker. Like note from Sarah on admin.

    console.log('At the instructors cohorts POST route', req.user._id);
    res.send('At the instructors cohort POST route');
  } catch (error) {
    console.log('Error with the instructor/cohorts/ POST route', error);
    return res.send({ error: 'error' });
  }
});

router.get('/cohorts/:id', requireAuth, async (req, res) => {
  //
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not an instructor' });
  }
  try {
    console.log('At the instructors cohorts/:id GET route', req.user._id);
    const cohort = await cohortRepository.findOne(req.params.id);

    const instructorsForCohort = cohort.instructors.map(instructor =>
      usersRepository.findOne(instructor),
    );
    Promise.all(instructorsForCohort).then(instructors => {
      const cohortWithInstructors = { ...cohort, instructors };

      const studentsForCohort = cohort.students.map(student =>
        usersRepository.findOne(student),
      );
      Promise.all(studentsForCohort).then(students => {
        const cohortWithStudents = { ...cohortWithInstructors, students };

        return res.send({ cohort: cohortWithStudents });
      });
    });
  } catch (error) {
    console.log('Error with the instructor/cohorts/:id GET route', error);
    return res.send({ error: 'error' });
  }
});

router.put('/cohorts/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not an instructor' });
  }
  try {
    //
    console.log('At the instructors cohorts PUT route', req.user._id);
    res.send('At the instructors cohort PUT route');
  } catch (error) {
    console.log('Error with the instructor/cohorts/ PUT route', error);
    return res.send({ error: 'error' });
  }
});

router.delete('/cohorts/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not an instructor' });
  }
  try {
    //
    console.log('At the instructors cohorts DELETE route', req.user._id);
    res.send('At the instructors cohort DELETE route');
  } catch (error) {
    console.log('Error with the instructor/cohorts/ DELETE route', error);
    return res.send({ error: 'error' });
  }
});
// Instructor can see what were turned in and grade them.

router.get('/deliverables', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not an instructor' });
  }
  try {
    //
    console.log('At the instructors deliverables GET route', req.user._id);
    res.send('At the instructors deliverables GET route');
  } catch (error) {
    console.log('Error with the instructor/deliverables/ GET route', error);
    return res.send({ error: 'error' });
  }
});

router.get('/deliverables/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not an instructor' });
  }
  try {
    //
    console.log('At the instructors deliverables GET route', req.user._id);
    res.send('At the instructors deliverables GET route');
  } catch (error) {
    console.log('Error with the instructor/deliverables/ GET route', error);
    return res.send({ error: 'error' });
  }
});

router.put('/deliverables/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).send({ error: 'Not an instructor' });
  }
  try {
    //
    console.log('At the instructors deliverables/:id PUT route', req.user._id);
    res.send('At the instructors deliverables/:id PUT route');
  } catch (error) {
    console.log('Error with instructor/deliverable/ PUT route:', error);
    return res.status(503).send({ user: null });
  }
});
module.exports = router;

/*************************************** */
//          Edit Functions
/*************************************** */

function editAssignment(
  toEditAssignmeent: Assignment,
  incoming: any,
): Assignment {
  const editedAssignment = { ...toEditAssignmeent };

  if (incoming.firstName) {
    editedAssignment.cohortType = incoming.cohortType;
  }
  if (incoming.lastName) {
    editedAssignment.cohortWeek = incoming.cohortWeek;
  }
  if (incoming.instructions) {
    editedAssignment.instructions = incoming.instructions;
  }
  if (incoming.instructor) {
    editedAssignment.instructor = incoming.instructor;
  }
  if (incoming.name) {
    editedAssignment.name = incoming.name;
  }
  if (incoming.resourcesUrls) {
    editedAssignment.resourcesUrls = incoming.resourcesUrls;
  }
  if (incoming.topics) {
    editedAssignment.topics = incoming.topics;
  }
  if (incoming.version) {
    editedAssignment.version++;
  } else {
    editedAssignment.version = 1;
  }
  return editedAssignment;
}
