

const express = require('express');
const router = express.Router();
router.use((req, res, next) => {
  console.log("TEAMS ROUTE HIT");
  next();
});
const teamcontroller = require('../controllers/teamController');
const { verifyToken } = require('../middlewares/authMiddleware');
router.use(verifyToken);
router.get('/', teamcontroller.getAllTeams);
router.post('/', teamcontroller.createteam);
router.get('/:id', teamcontroller.getTeam);
router.put('/:id', teamcontroller.updateteam);
router.delete('/:id', teamcontroller.deleteTeam);

module.exports = router;