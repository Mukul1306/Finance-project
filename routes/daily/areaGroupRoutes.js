const express =
require("express");

const router =
express.Router();

const {

createAreaGroup,
getAreaGroups,
getAreaGroup,
updateAreaGroup,
deleteAreaGroup

} = require(
"../../controllers/daily/AreaGroupController"
);


// CREATE

router.post(
"/create-area",
createAreaGroup
);


// GET ALL

router.get(
"/areas",
getAreaGroups
);


// GET SINGLE

router.get(
"/area/:id",
getAreaGroup
);


// UPDATE

router.put(
"/area/:id",
updateAreaGroup
);


// DELETE

router.delete(
"/area/:id",
deleteAreaGroup
);

router.get("/hello", (req, res) => {
  res.json({
    success: true,
    message: "Area Route Working"
  });
});

module.exports =
router;