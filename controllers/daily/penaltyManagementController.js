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
// PENALTY MANAGEMENT
// ======================================================

exports.getPenaltyManagement = async (req, res) => {

    try {

        // ==================================================
        // TODAY
        // ==================================================

        const today = new Date();

        today.setHours(0, 0, 0, 0);


        // ==================================================
        // MONTH RANGE
        // ==================================================

        const firstDayOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        const firstDayOfNextMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1
        );


        // ==================================================
        // FETCH ALL DATA
        // ==================================================

        const [
            members,
            savings,
            dailyTransactions,
            loans,
            loanCollections
        ] = await Promise.all([

            DailyMember.find()
                .select("memberId memberName mobile")
                .sort({ createdAt: -1 }),

            DailySaving.find(),

            DailyTransaction.find()
                .select(
                    "savingAccount member collectionDate penalty"
                ),

            DailyLoan.find({
                status: {
                    $in: ["ACTIVE", "OVERDUE"]
                }
            }),

            LoanCollection.find()
                .select(
                    "loan member installmentNo paymentDate penalty"
                )

        ]);


        // ==================================================
        // CREATE MEMBER MAP
        // ==================================================

        const memberMap = new Map();


        members.forEach(member => {

            memberMap.set(
                member._id.toString(),
                {
                    _id: member._id,

                    memberId: member.memberId,

                    memberName: member.memberName,

                    mobile: member.mobile,

                    dailyPenaltyPending: 0,

                    loanPenaltyPending: 0,

                    totalPenaltyPending: 0
                }
            );

        });



        // ==================================================
        // DAILY TRANSACTION MAP
        // savingId -> transactions
        // ==================================================

        const dailyTransactionMap = new Map();


        dailyTransactions.forEach(transaction => {

            if (!transaction.savingAccount) {
                return;
            }

            const savingId =
                transaction.savingAccount.toString();


            if (!dailyTransactionMap.has(savingId)) {

                dailyTransactionMap.set(
                    savingId,
                    []
                );

            }


            dailyTransactionMap
                .get(savingId)
                .push(transaction);

        });



        // ==================================================
        // LOAN COLLECTION MAP
        // loanId -> collections
        // ==================================================

        const loanCollectionMap = new Map();


        loanCollections.forEach(collection => {

            if (!collection.loan) {
                return;
            }

            const loanId =
                collection.loan.toString();


            if (!loanCollectionMap.has(loanId)) {

                loanCollectionMap.set(
                    loanId,
                    []
                );

            }


            loanCollectionMap
                .get(loanId)
                .push(collection);

        });



        // ==================================================
        // DAILY PENALTY COLLECTED
        // ==================================================

        const dailyPenaltyCollected =
            dailyTransactions.reduce(
                (total, transaction) => {

                    return (
                        total +
                        Number(transaction.penalty || 0)
                    );

                },
                0
            );



        // ==================================================
        // DAILY PENALTY THIS MONTH
        // ==================================================

        const dailyPenaltyThisMonth =
            dailyTransactions
                .filter(transaction => {

                    if (!transaction.collectionDate) {
                        return false;
                    }

                    const date =
                        new Date(
                            transaction.collectionDate
                        );

                    return (
                        date >= firstDayOfMonth &&
                        date < firstDayOfNextMonth
                    );

                })
                .reduce(
                    (total, transaction) => {

                        return (
                            total +
                            Number(transaction.penalty || 0)
                        );

                    },
                    0
                );



        // ==================================================
        // LOAN PENALTY COLLECTED
        // ==================================================

        const loanPenaltyCollected =
            loanCollections.reduce(
                (total, collection) => {

                    return (
                        total +
                        Number(collection.penalty || 0)
                    );

                },
                0
            );



        // ==================================================
        // LOAN PENALTY THIS MONTH
        // ==================================================

        const loanPenaltyThisMonth =
            loanCollections
                .filter(collection => {

                    if (!collection.paymentDate) {
                        return false;
                    }

                    const date =
                        new Date(
                            collection.paymentDate
                        );

                    return (
                        date >= firstDayOfMonth &&
                        date < firstDayOfNextMonth
                    );

                })
                .reduce(
                    (total, collection) => {

                        return (
                            total +
                            Number(collection.penalty || 0)
                        );

                    },
                    0
                );



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


            const transactions =
                dailyTransactionMap.get(
                    saving._id.toString()
                ) || [];


            // ==============================================
            // PAID DATE SET
            // ==============================================

            const paidDates = new Set();


            transactions.forEach(transaction => {

                if (!transaction.collectionDate) {
                    return;
                }


                const date =
                    new Date(
                        transaction.collectionDate
                    );

                date.setHours(0, 0, 0, 0);


                paidDates.add(
                    date.getTime()
                );

            });



            // ==============================================
            // START DATE
            // ==============================================

            if (!saving.startDate) {
                continue;
            }


            const startDate =
                new Date(saving.startDate);

            startDate.setHours(0, 0, 0, 0);



            // ==============================================
            // END DATE
            // ==============================================

            let endDate = today;


            if (saving.endDate) {

                endDate =
                    new Date(saving.endDate);

                endDate.setHours(0, 0, 0, 0);


                if (endDate > today) {
                    endDate = today;
                }

            }



            // ==============================================
            // LOOP EVERY DUE DAY
            // ==============================================

            let current =
                new Date(startDate);


            while (current <= endDate) {

                const currentTime =
                    current.getTime();


                // Already collected
                if (paidDates.has(currentTime)) {

                    current.setDate(
                        current.getDate() + 1
                    );

                    continue;
                }



                // ==========================================
                // DELAY
                // ==========================================

                const delay =
                    Math.floor(
                        (
                            today -
                            current
                        ) /
                        (1000 * 60 * 60 * 24)
                    );



                // Still within grace period
                if (
                    delay <=
                    Number(saving.graceDays || 0)
                ) {

                    current.setDate(
                        current.getDate() + 1
                    );

                    continue;
                }



                // ==========================================
                // CALCULATE DAILY PENALTY
                // ==========================================

                let penalty = 0;


                // FIXED PENALTY
                if (
                    saving.penaltyType === "FIXED"
                ) {

                    penalty =
                        Number(
                            saving.penaltyValue || 0
                        );

                }


                // PERCENTAGE PENALTY
                else if (
                    saving.penaltyType === "PERCENTAGE"
                ) {

                    /*
                     * IMPORTANT:
                     *
                     * Percentage pending penalty can only
                     * be calculated accurately when the
                     * expected daily amount is available.
                     *
                     * For FIXED collection type, use
                     * fixedAmount.
                     */

                    if (
                        saving.collectionType === "FIXED"
                    ) {

                        penalty =
                            Math.round(
                                (
                                    Number(
                                        saving.fixedAmount || 0
                                    ) *
                                    Number(
                                        saving.penaltyValue || 0
                                    )
                                ) / 100
                            );

                    } else {

                        /*
                         * No fixed expected amount exists
                         * for flexible collection.
                         *
                         * Therefore don't invent a
                         * penalty amount.
                         */

                        penalty = 0;

                    }

                }


                member.dailyPenaltyPending +=
                    penalty;



                current.setDate(
                    current.getDate() + 1
                );

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



            // ==============================================
            // PAID INSTALLMENTS
            // ==============================================

            const paidInstallments = new Set();


            collections.forEach(collection => {

                paidInstallments.add(
                    Number(
                        collection.installmentNo
                    )
                );

            });



            // ==============================================
            // TOTAL INSTALLMENTS
            // ==============================================

            let totalInstallments = 0;


            if (
                loan.loanType === "DAILY"
            ) {

                totalInstallments =
                    Number(
                        loan.durationDays || 0
                    );

            }

            else if (
                loan.loanType === "WEEKLY"
            ) {

                totalInstallments =
                    Number(
                        loan.durationWeeks || 0
                    );

            }

            else if (
                loan.loanType === "MONTHLY"
            ) {

                totalInstallments =
                    Number(
                        loan.durationMonths || 0
                    );

            }

            else if (
                loan.loanType === "FIXED"
            ) {

                totalInstallments =
                    Number(
                        loan.loanTenureMonths || 0
                    );

            }



            // =================================================
            // CHECK EVERY INSTALLMENT
            // =================================================

            for (
                let installmentNo = 1;
                installmentNo <= totalInstallments;
                installmentNo++
            ) {


                // =============================================
                // ALREADY PAID
                // =============================================

                if (
                    paidInstallments.has(
                        installmentNo
                    )
                ) {

                    continue;

                }



                // =============================================
                // CALCULATE DUE DATE
                // =============================================

                const dueDate =
                    new Date(loan.loanDate);


                if (
                    loan.loanType === "DAILY"
                ) {

                    dueDate.setDate(
                        dueDate.getDate() +
                        (installmentNo - 1)
                    );

                }

                else if (
                    loan.loanType === "WEEKLY"
                ) {

                    dueDate.setDate(
                        dueDate.getDate() +
                        (
                            (installmentNo - 1) *
                            7
                        )
                    );

                }

                else {

                    /*
                     * IMPORTANT:
                     *
                     * Your existing collectEmi logic
                     * calculates MONTHLY/FIXED due date
                     * using installmentNo directly.
                     *
                     * We keep the same behavior here.
                     */

                    dueDate.setMonth(
                        dueDate.getMonth() +
                        installmentNo
                    );

                }


                dueDate.setHours(
                    0,
                    0,
                    0,
                    0
                );



                // =============================================
                // FUTURE EMI
                // =============================================

                if (
                    dueDate > today
                ) {

                    continue;

                }



                // =============================================
                // DELAY
                // =============================================

                const delay =
                    Math.floor(
                        (
                            today -
                            dueDate
                        ) /
                        (1000 * 60 * 60 * 24)
                    );



                // =============================================
                // GRACE PERIOD
                // =============================================

                if (
                    delay <=
                    Number(
                        loan.gracePeriod || 0
                    )
                ) {

                    continue;

                }



                // =============================================
                // PENALTY
                // =============================================

                let penalty = 0;



                // =================================================
                // DAILY / WEEKLY
                // =================================================

                if (
                    loan.loanType === "DAILY" ||
                    loan.loanType === "WEEKLY"
                ) {

                    if (
                        loan.penaltyType ===
                        "PERCENTAGE"
                    ) {

                        penalty =
                            Math.round(
                                (
                                    Number(
                                        loan.emiAmount || 0
                                    ) *
                                    Number(
                                        loan.penaltyValue || 0
                                    )
                                ) / 100
                            );

                    }

                    else {

                        penalty =
                            Number(
                                loan.penaltyValue || 0
                            );

                    }

                }



                // =================================================
                // MONTHLY / FIXED
                // =================================================

                else {

                    let penaltyBase =
                        Number(
                            loan.emiAmount || 0
                        );


                    // FIXED LOAN
                    if (
                        loan.loanType === "FIXED"
                    ) {

                        const tenure =
                            Number(
                                loan.loanTenureMonths || 0
                            );


                        if (tenure > 0) {

                            penaltyBase =
                                Math.round(
                                    Number(
                                        loan.totalInterest || 0
                                    ) /
                                    tenure
                                );

                        }

                    }


                    penalty =
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

                }



                // =============================================
                // ADD TO MEMBER
                // =============================================

                member.loanPenaltyPending +=
                    penalty;

            }

        }



        // ======================================================
        // FINAL MEMBER TOTAL
        // ======================================================

        const memberList =
            Array.from(
                memberMap.values()
            );


        memberList.forEach(member => {

            member.totalPenaltyPending =
                Number(
                    member.dailyPenaltyPending || 0
                ) +
                Number(
                    member.loanPenaltyPending || 0
                );

        });



        // ======================================================
        // TOTAL DAILY PENDING
        // ======================================================

        const dailyPenaltyPending =
            memberList.reduce(
                (total, member) => {

                    return (
                        total +
                        Number(
                            member.dailyPenaltyPending || 0
                        )
                    );

                },
                0
            );



        // ======================================================
        // TOTAL LOAN PENDING
        // ======================================================

        const loanPenaltyPending =
            memberList.reduce(
                (total, member) => {

                    return (
                        total +
                        Number(
                            member.loanPenaltyPending || 0
                        )
                    );

                },
                0
            );



        // ======================================================
        // RESPONSE
        // ======================================================

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