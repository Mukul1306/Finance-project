const DailyMember = require("../../models/daily/DailyMember");
const DailySaving = require("../../models/daily/DailySaving");
const DailyTransaction = require("../../models/daily/DailyTransaction");
const DailyLoan = require("../../models/daily/DailyLoan");
const LoanCollection = require("../../models/daily/LoanCollection");

// ======================================================
// HELPER: MONTHLY / FIXED LOAN PENALTY
// ======================================================

const calculateMonthlyFixedPenalty = ({
    dueDate,
    today,
    gracePeriod,
    penaltyType,
    penaltyValue,
    penaltyBase
}) => {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const current = new Date(today);
    current.setHours(0, 0, 0, 0);

    const grace = Number(gracePeriod || 0);

    const penaltyStartDate = new Date(due);

    penaltyStartDate.setDate(
        penaltyStartDate.getDate() + grace + 1
    );

    penaltyStartDate.setHours(0, 0, 0, 0);

    // Still inside grace period
    if (current < penaltyStartDate) {
        return 0;
    }

    const monthlyPenalty =
        penaltyType === "PERCENTAGE"
            ? Math.round(
                  (
                      Number(penaltyBase) *
                      Number(penaltyValue || 0)
                  ) / 100
              )
            : Number(penaltyValue || 0);

    const penaltyMonths =
        (
            (current.getFullYear() -
                penaltyStartDate.getFullYear()) * 12
        ) +
        (
            current.getMonth() -
            penaltyStartDate.getMonth()
        ) +
        1;

    return monthlyPenalty * penaltyMonths;
};


// ======================================================
// HELPER: START OF DAY
// ======================================================

const startOfDay = (date) => {
    const d = new Date(date);

    d.setHours(0, 0, 0, 0);

    return d;
};


// ======================================================
// HELPER: DIFFERENCE IN DAYS
// ======================================================

const differenceInDays = (fromDate, toDate) => {
    const from = startOfDay(fromDate);
    const to = startOfDay(toDate);

    return Math.floor(
        (to - from) /
        (1000 * 60 * 60 * 24)
    );
};


// ======================================================
// HELPER: ADD DAYS
// ======================================================

const addDays = (date, days) => {
    const d = new Date(date);

    d.setDate(
        d.getDate() + Number(days || 0)
    );

    return d;
};


// ======================================================
// HELPER: ADD WEEKS
// ======================================================

const addWeeks = (date, weeks) => {
    return addDays(
        date,
        Number(weeks || 0) * 7
    );
};


// ======================================================
// HELPER: DATE KEY
// ======================================================

const getDateKey = (date) => {
    const d = startOfDay(date);

    return `${d.getFullYear()}-${String(
        d.getMonth() + 1
    ).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
};


// ======================================================
// PENALTY MANAGEMENT
// ======================================================

exports.getPenaltyManagement = async (req, res) => {

    try {

        // ==================================================
        // TODAY
        // ==================================================

        const today = startOfDay(new Date());


        // ==================================================
        // MONTH RANGE
        // ==================================================

        const firstDayOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        firstDayOfMonth.setHours(0, 0, 0, 0);


        const firstDayOfNextMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1
        );

        firstDayOfNextMonth.setHours(0, 0, 0, 0);


        // ==================================================
        // FETCH DATA
        // ==================================================
        //
        // IMPORTANT:
        // lean() avoids Mongoose document overhead.
        //
        // Only required fields are selected.
        // ==================================================

        const [
            members,
            savings,
            dailyTransactions,
            loans,
            loanCollections
        ] = await Promise.all([

            DailyMember.find()
                .select(
                    "_id memberId memberName mobile"
                )
                .sort({ createdAt: -1 })
                .lean(),

            DailySaving.find()
                .select(
                    "_id member startDate endDate " +
                    "graceDays penaltyType penaltyValue " +
                    "collectionType fixedAmount"
                )
                .lean(),

            DailyTransaction.find()
                .select(
                    "_id savingAccount member collectionDate penalty"
                )
                .lean(),

            DailyLoan.find({
                status: {
                    $in: [
                        "ACTIVE",
                        "OVERDUE"
                    ]
                }
            })
                .select(
                    "_id member loanType loanDate " +
                    "durationDays durationWeeks " +
                    "durationMonths loanTenureMonths " +
                    "gracePeriod penaltyType penaltyValue " +
                    "emiAmount totalInterest"
                )
                .lean(),

            LoanCollection.find()
                .select(
                    "_id loan member installmentNo " +
                    "paymentDate penalty"
                )
                .lean()
        ]);


        // ==================================================
        // MEMBER MAP
        // ==================================================

        const memberMap = new Map();

        for (const member of members) {

            memberMap.set(
                member._id.toString(),
                {
                    _id: member._id,

                    memberId:
                        member.memberId,

                    memberName:
                        member.memberName,

                    mobile:
                        member.mobile,

                    dailyPenaltyPending: 0,

                    loanPenaltyPending: 0,

                    totalPenaltyPending: 0
                }
            );

        }


        // ==================================================
        // DAILY TRANSACTION MAP
        //
        // savingId -> transactions
        // ==================================================

        const dailyTransactionMap =
            new Map();

        // Total daily penalty collected
        let dailyPenaltyCollected = 0;

        // Daily penalty collected this month
        let dailyPenaltyThisMonth = 0;


        for (const transaction of dailyTransactions) {

            const penalty =
                Number(
                    transaction.penalty || 0
                );

            dailyPenaltyCollected += penalty;


            // ----------------------------------------------
            // THIS MONTH
            // ----------------------------------------------

            if (
                transaction.collectionDate
            ) {

                const collectionDate =
                    new Date(
                        transaction.collectionDate
                    );

                if (
                    collectionDate >=
                        firstDayOfMonth &&
                    collectionDate <
                        firstDayOfNextMonth
                ) {

                    dailyPenaltyThisMonth +=
                        penalty;

                }

            }


            // ----------------------------------------------
            // MAP BY SAVING ACCOUNT
            // ----------------------------------------------

            if (
                !transaction.savingAccount
            ) {
                continue;
            }


            const savingId =
                transaction.savingAccount.toString();


            if (
                !dailyTransactionMap.has(
                    savingId
                )
            ) {

                dailyTransactionMap.set(
                    savingId,
                    []
                );

            }


            dailyTransactionMap
                .get(savingId)
                .push(transaction);

        }


        // ==================================================
        // LOAN COLLECTION MAP
        //
        // loanId -> collections
        // ==================================================

        const loanCollectionMap =
            new Map();


        // Total loan penalty collected
        let loanPenaltyCollected = 0;

        // Loan penalty collected this month
        let loanPenaltyThisMonth = 0;


        for (const collection of loanCollections) {

            const penalty =
                Number(
                    collection.penalty || 0
                );


            loanPenaltyCollected += penalty;


            // ----------------------------------------------
            // THIS MONTH
            // ----------------------------------------------

            if (
                collection.paymentDate
            ) {

                const paymentDate =
                    new Date(
                        collection.paymentDate
                    );

                if (
                    paymentDate >=
                        firstDayOfMonth &&
                    paymentDate <
                        firstDayOfNextMonth
                ) {

                    loanPenaltyThisMonth +=
                        penalty;

                }

            }


            // ----------------------------------------------
            // MAP BY LOAN
            // ----------------------------------------------

            if (
                !collection.loan
            ) {
                continue;
            }


            const loanId =
                collection.loan.toString();


            if (
                !loanCollectionMap.has(
                    loanId
                )
            ) {

                loanCollectionMap.set(
                    loanId,
                    []
                );

            }


            loanCollectionMap
                .get(loanId)
                .push(collection);

        }


        // ==================================================
        // DAILY PENALTY PENDING
        // ==================================================

        for (const saving of savings) {

            if (!saving.member) {
                continue;
            }


            const memberId =
                saving.member.toString();


            const member =
                memberMap.get(memberId);


            if (!member) {
                continue;
            }


            // ----------------------------------------------
            // START DATE
            // ----------------------------------------------

            if (!saving.startDate) {
                continue;
            }


            const startDate =
                startOfDay(
                    saving.startDate
                );


            // ----------------------------------------------
            // END DATE
            // ----------------------------------------------

            let endDate =
                new Date(today);


            if (saving.endDate) {

                endDate =
                    startOfDay(
                        saving.endDate
                    );


                if (
                    endDate > today
                ) {

                    endDate =
                        new Date(today);

                }

            }


            // If saving starts after today
            if (
                startDate > endDate
            ) {
                continue;
            }


            // ----------------------------------------------
            // GRACE DAYS
            // ----------------------------------------------

            const graceDays =
                Number(
                    saving.graceDays || 0
                );


            // ==================================================
            // PAID DATE SET
            // ==================================================

            const transactions =
                dailyTransactionMap.get(
                    saving._id.toString()
                ) || [];


            const paidDates =
                new Set();


            for (
                const transaction
                of transactions
            ) {

                if (
                    !transaction.collectionDate
                ) {
                    continue;
                }


                paidDates.add(
                    getDateKey(
                        transaction.collectionDate
                    )
                );

            }


            // ==================================================
            // LAST DATE WHERE PENALTY CAN START
            // ==================================================
            //
            // Original logic:
            //
            // delay <= graceDays
            // means NO penalty.
            //
            // Therefore penalty starts after:
            //
            // dueDate + graceDays
            //
            // ==================================================

            const penaltyEligibleEnd =
                addDays(
                    today,
                    -graceDays - 1
                );


            const effectiveEnd =
                penaltyEligibleEnd <
                    endDate
                    ? penaltyEligibleEnd
                    : endDate;


            if (
                effectiveEnd < startDate
            ) {
                continue;
            }


            // ==================================================
            // FIXED / PERCENTAGE PENALTY
            // ==================================================

            let penaltyPerDay = 0;


            if (
                saving.penaltyType ===
                "FIXED"
            ) {

                penaltyPerDay =
                    Number(
                        saving.penaltyValue || 0
                    );

            }

            else if (
                saving.penaltyType ===
                "PERCENTAGE"
            ) {

                // ------------------------------------------
                // FIXED COLLECTION
                // ------------------------------------------

                if (
                    saving.collectionType ===
                    "FIXED"
                ) {

                    penaltyPerDay =
                        Math.round(
                            (
                                Number(
                                    saving.fixedAmount ||
                                    0
                                ) *
                                Number(
                                    saving.penaltyValue ||
                                    0
                                )
                            ) / 100
                        );

                }

                // ------------------------------------------
                // FLEXIBLE COLLECTION
                // ------------------------------------------
                //
                // Same as original:
                // do not invent a penalty.
                // ------------------------------------------

                else {

                    penaltyPerDay = 0;

                }

            }


            // ==================================================
            // IF PENALTY IS ZERO
            // ==================================================

            if (
                penaltyPerDay <= 0
            ) {
                continue;
            }


            // ==================================================
            // TOTAL POSSIBLE DUE DAYS
            // ==================================================

            const totalEligibleDays =
                differenceInDays(
                    startDate,
                    effectiveEnd
                ) + 1;


            if (
                totalEligibleDays <= 0
            ) {
                continue;
            }


            // ==================================================
            // REMOVE PAID DAYS
            // ==================================================

            let unpaidEligibleDays =
                totalEligibleDays;


            // We only need to check paid dates.
            // This is much cheaper than looping every
            // calendar day from startDate to today.
            // ==================================================

            for (
                const paidDateKey
                of paidDates
            ) {

                const parts =
                    paidDateKey.split("-");


                if (
                    parts.length !== 3
                ) {
                    continue;
                }


                const paidDate =
                    new Date(
                        Number(parts[0]),
                        Number(parts[1]) - 1,
                        Number(parts[2])
                    );


                paidDate.setHours(
                    0,
                    0,
                    0,
                    0
                );


                if (
                    paidDate >= startDate &&
                    paidDate <= effectiveEnd
                ) {

                    unpaidEligibleDays--;

                }

            }


            if (
                unpaidEligibleDays > 0
            ) {

                member.dailyPenaltyPending +=
                    unpaidEligibleDays *
                    penaltyPerDay;

            }

        }


        // ==================================================
        // LOAN PENALTY PENDING
        // ==================================================

        for (const loan of loans) {

            if (!loan.member) {
                continue;
            }


            const memberId =
                loan.member.toString();


            const member =
                memberMap.get(memberId);


            if (!member) {
                continue;
            }


            const collections =
                loanCollectionMap.get(
                    loan._id.toString()
                ) || [];


            // ==================================================
            // PAID INSTALLMENTS
            // ==================================================

            const paidInstallments =
                new Set();


            for (
                const collection
                of collections
            ) {

                const installmentNo =
                    Number(
                        collection.installmentNo
                    );


                if (
                    installmentNo > 0
                ) {

                    paidInstallments.add(
                        installmentNo
                    );

                }

            }


            // ==================================================
            // TOTAL INSTALLMENTS
            // ==================================================

            let totalInstallments = 0;


            if (
                loan.loanType ===
                "DAILY"
            ) {

                totalInstallments =
                    Number(
                        loan.durationDays || 0
                    );

            }

            else if (
                loan.loanType ===
                "WEEKLY"
            ) {

                totalInstallments =
                    Number(
                        loan.durationWeeks || 0
                    );

            }

            else if (
                loan.loanType ===
                "MONTHLY"
            ) {

                totalInstallments =
                    Number(
                        loan.durationMonths || 0
                    );

            }

            else if (
                loan.loanType ===
                "FIXED"
            ) {

                totalInstallments =
                    Number(
                        loan.loanTenureMonths || 0
                    );

            }


            if (
                totalInstallments <= 0
            ) {
                continue;
            }


            // ==================================================
            // DAILY / WEEKLY
            // ==================================================
            //
            // These penalties are fixed per overdue
            // installment, so we can calculate the count
            // without unnecessary date processing.
            //
            // ==================================================

            if (
                loan.loanType === "DAILY" ||
                loan.loanType === "WEEKLY"
            ) {

                let dueInterval =
                    loan.loanType ===
                    "DAILY"
                        ? 1
                        : 7;


                const loanDate =
                    startOfDay(
                        loan.loanDate
                    );


                const gracePeriod =
                    Number(
                        loan.gracePeriod || 0
                    );


                // ------------------------------------------
                // Last installment due before grace
                // ------------------------------------------

                let overdueInstallments = 0;


                for (
                    let installmentNo = 1;
                    installmentNo <=
                        totalInstallments;
                    installmentNo++
                ) {

                    if (
                        paidInstallments.has(
                            installmentNo
                        )
                    ) {
                        continue;
                    }


                    const dueDate =
                        new Date(
                            loanDate
                        );


                    dueDate.setDate(
                        dueDate.getDate() +
                        (
                            installmentNo - 1
                        ) *
                        dueInterval
                    );


                    dueDate.setHours(
                        0,
                        0,
                        0,
                        0
                    );


                    if (
                        dueDate > today
                    ) {
                        continue;
                    }


                    const delay =
                        differenceInDays(
                            dueDate,
                            today
                        );


                    if (
                        delay <=
                        gracePeriod
                    ) {
                        continue;
                    }


                    overdueInstallments++;

                }


                // ------------------------------------------
                // PENALTY
                // ------------------------------------------

                let penaltyPerInstallment = 0;


                if (
                    loan.penaltyType ===
                    "PERCENTAGE"
                ) {

                    penaltyPerInstallment =
                        Math.round(
                            (
                                Number(
                                    loan.emiAmount ||
                                    0
                                ) *
                                Number(
                                    loan.penaltyValue ||
                                    0
                                )
                            ) / 100
                        );

                }

                else {

                    penaltyPerInstallment =
                        Number(
                            loan.penaltyValue ||
                            0
                        );

                }


                member.loanPenaltyPending +=
                    overdueInstallments *
                    penaltyPerInstallment;

            }


            // ==================================================
            // MONTHLY / FIXED
            // ==================================================
            //
            // Monthly/fixed penalty depends on the number
            // of overdue months, so we retain the original
            // installment-level calculation.
            //
            // ==================================================

            else {

                for (
                    let installmentNo = 1;
                    installmentNo <=
                        totalInstallments;
                    installmentNo++
                ) {

                    // ------------------------------------------
                    // ALREADY PAID
                    // ------------------------------------------

                    if (
                        paidInstallments.has(
                            installmentNo
                        )
                    ) {

                        continue;

                    }


                    // ------------------------------------------
                    // DUE DATE
                    // ------------------------------------------

                    const dueDate =
                        new Date(
                            loan.loanDate
                        );


                    /*
                     * IMPORTANT:
                     *
                     * Keeping your existing behavior.
                     *
                     * Monthly/FIXED installment number
                     * is directly added to month.
                     */

                    dueDate.setMonth(
                        dueDate.getMonth() +
                        installmentNo
                    );


                    dueDate.setHours(
                        0,
                        0,
                        0,
                        0
                    );


                    // ------------------------------------------
                    // FUTURE EMI
                    // ------------------------------------------

                    if (
                        dueDate > today
                    ) {

                        continue;

                    }


                    // ------------------------------------------
                    // DELAY
                    // ------------------------------------------

                    const delay =
                        differenceInDays(
                            dueDate,
                            today
                        );


                    // ------------------------------------------
                    // GRACE
                    // ------------------------------------------

                    if (
                        delay <=
                        Number(
                            loan.gracePeriod ||
                            0
                        )
                    ) {

                        continue;

                    }


                    // ------------------------------------------
                    // PENALTY BASE
                    // ------------------------------------------

                    let penaltyBase =
                        Number(
                            loan.emiAmount ||
                            0
                        );


                    // ------------------------------------------
                    // FIXED LOAN
                    // ------------------------------------------

                    if (
                        loan.loanType ===
                        "FIXED"
                    ) {

                        const tenure =
                            Number(
                                loan.loanTenureMonths ||
                                0
                            );


                        if (
                            tenure > 0
                        ) {

                            penaltyBase =
                                Math.round(
                                    Number(
                                        loan.totalInterest ||
                                        0
                                    ) /
                                    tenure
                                );

                        }

                    }


                    // ------------------------------------------
                    // MONTHLY / FIXED PENALTY
                    // ------------------------------------------

                    const penalty =
                        calculateMonthlyFixedPenalty({
                            dueDate,

                            today,

                            gracePeriod:
                                loan.gracePeriod,

                            penaltyType:
                                loan.penaltyType,

                            penaltyValue:
                                loan.penaltyValue,

                            penaltyBase
                        });


                    member.loanPenaltyPending +=
                        penalty;

                }

            }

        }


        // ==================================================
        // FINAL MEMBER TOTAL
        // ==================================================

        const memberList =
            Array.from(
                memberMap.values()
            );


        // ==================================================
        // CALCULATE TOTAL PENALTY
        // ==================================================

        let dailyPenaltyPending = 0;

        let loanPenaltyPending = 0;


        for (
            const member
            of memberList
        ) {

            member.dailyPenaltyPending =
                Number(
                    member.dailyPenaltyPending ||
                    0
                );


            member.loanPenaltyPending =
                Number(
                    member.loanPenaltyPending ||
                    0
                );


            member.totalPenaltyPending =
                member.dailyPenaltyPending +
                member.loanPenaltyPending;


            dailyPenaltyPending +=
                member.dailyPenaltyPending;


            loanPenaltyPending +=
                member.loanPenaltyPending;

        }


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(200).json({

            success: true,

            cards: {

                dailyPenaltyPending,

                dailyPenaltyCollected,

                dailyPenaltyThisMonth,

                loanPenaltyPending,

                loanPenaltyCollected,

                loanPenaltyThisMonth

            },

            members: memberList

        });


    } catch (error) {

        console.error(
            "PENALTY MANAGEMENT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};