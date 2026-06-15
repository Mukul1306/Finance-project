const express =
require("express");
console.log("Society Routes File Loaded");
const router =
express.Router();

const {

    createSociety,

    getSocieties,

    getSocietyById,

    updateSociety,

    deleteSociety

}

=

require(
"../controllers/societyController"
);



router.post(
    "/create",
    createSociety
);

router.get(
    "/all",
    getSocieties
);

router.get(
    "/:id",
    getSocietyById
);

router.put(
    "/update/:id",
    updateSociety
);

router.delete(
    "/delete/:id",
    deleteSociety
);


module.exports =
router;