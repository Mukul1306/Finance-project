exports.getDashboard = async (req, res) => {

  try {

    const dashboardData = {

      monthlyCollection: 3412000,

      pendingToday: 112000,

      activeRoutes: 18,

      liveCollection: 145000,

      depositors: 124,

      pendingAccounts: 48

    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};