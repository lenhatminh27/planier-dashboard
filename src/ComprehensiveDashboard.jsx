import React, { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// --- SAFE HELPER FUNCTIONS ---
const parseDurationToSeconds = (durationStr) => {
  if (typeof durationStr !== "string") return 0
  const match = durationStr.match(/(\d+)\s*phút\s*(\d+)\s*giây/)
  return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 0
}

const parsePercentage = (percentageStr) => {
  if (typeof percentageStr !== "string") return 0
  return parseFloat(percentageStr.replace("%", "")) || 0
}

// Format number to currency
const formatCurrency = (value) => {
  if (typeof value !== "number") return "0 ₫"
  return `${value.toLocaleString("vi-VN")} ₫`
}

const ComprehensiveDashboard = () => {
  const [excelData, setExcelData] = useState(null)
  const [statisticApiData, setStatisticApiData] = useState(null)
  const [revenueApiData, setRevenueApiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    const fetchAllData = async () => {
      const results = await Promise.allSettled([
        fetch("/data.xlsx"),
        fetch("/statistic.json"),
        fetch("/revenue.json"),
      ])

      const newErrors = []

      if (results[0].status === "fulfilled" && results[0].value.ok) {
        const excelResponse = results[0].value
        const arrayBuffer = await excelResponse.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: "buffer" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })
        processExcelData(rawData)
      } else {
        newErrors.push("Failed to load Excel data.")
      }

      if (results[1].status === "fulfilled" && results[1].value.ok) {
        const statisticJson = await results[1].value.json()
        setStatisticApiData(statisticJson.data)
      } else {
        newErrors.push("Failed to load statistics data.")
      }

      if (results[2].status === "fulfilled" && results[2].value.ok) {
        const revenueJson = await results[2].value.json()
        setRevenueApiData(revenueJson.data)
      } else {
        newErrors.push("Failed to load revenue data.")
      }

      if (newErrors.length > 0) setErrors(newErrors)
      setLoading(false)
    }
    fetchAllData()
  }, [])

  const processExcelData = (data) => {
    const getRow = (index) => data[index] || []
    setExcelData({
      overview: [
        { metric: "Total Visits", value: Number(getRow(2)[3]) || 0 },
        {
          metric: "Avg. Duration (s)",
          value: parseDurationToSeconds(getRow(3)[3]),
        },
        { metric: "Bounce Rate (%)", value: parsePercentage(getRow(4)[3]) },
      ],
      conversion: [
        { metric: "Sign-ups", value: Number(getRow(9)[3]) || 0 },
        { metric: "Upgrades", value: Number(getRow(10)[3]) || 0 },
        {
          metric: "Conversion Rate (%)",
          value: parsePercentage(getRow(11)[3]),
        },
      ],
      daily: (data.length > 15 ? data.slice(15) : [])
        .map((row) =>
          row && row[0]
            ? {
                date: String(row[0]),
                visits: Number(row[1]) || 0,
                signUps: Number(row[2]) || 0,
                upgrades: Number(row[3]) || 0,
              }
            : null
        )
        .filter(Boolean),
    })
  }

  const PIE_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  const combinedGrowthData =
    statisticApiData?.userGrowthOverTime.dataPoints.map((userPoint, index) => ({
      ...userPoint,
      revenue: statisticApiData.totalRevenue.dataPoints[index]?.revenue || 0,
    }))

  if (loading) return <div className="status-message">Loading all data...</div>

  return (
    <div className="full-dashboard">
      {errors.length > 0 && (
        <div className="analytics-container error-container">
          <h2 className="chart-title error-title">Error Notifications</h2>
          <ul>
            {errors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --- SYSTEM REPORT SECTION --- */}
      <div className="section-title">SYSTEM REPORT</div>

      {/* KPI Cards */}
      {statisticApiData && revenueApiData && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <h3>Total Revenue ({statisticApiData.filterYear})</h3>
            <p>{formatCurrency(revenueApiData.totalRevenueForYear)}</p>
          </div>
          <div className="kpi-card">
            <h3>Total Users</h3>
            <p>{statisticApiData.totalUsers.toLocaleString("vi-VN")}</p>
          </div>
          <div className="kpi-card">
            <h3>This Month's Revenue</h3>
            <p>{formatCurrency(revenueApiData.currentMonthRevenue)}</p>
          </div>
          <div className="kpi-card">
            <h3>Monthly Growth</h3>
            <p>{revenueApiData.revenueGrowthRatePercentage.toFixed(2)}%</p>
          </div>
        </div>
      )}

      <div className="column-charts-area">
        {statisticApiData ? (
          <div className="analytics-container">
            <h2 className="chart-title">User Growth & Revenue</h2>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={combinedGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Revenue",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Users",
                    angle: -90,
                    position: "insideRight",
                  }}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === "Revenue"
                      ? formatCurrency(value)
                      : value.toLocaleString("vi-VN")
                  }
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  yAxisId="left"
                  name="Revenue"
                  fill="#8884d8"
                />
                <Line
                  type="monotone"
                  dataKey="totalUsers"
                  yAxisId="right"
                  name="Users"
                  stroke="#ff7300"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="analytics-container status-message">
            No statistic data available.
          </div>
        )}

        {revenueApiData ? (
          <div className="analytics-container">
            <h2 className="chart-title">Package Sales Ratio</h2>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={revenueApiData.soldPlansPercentageChart.dataPoints}
                  dataKey="percentage"
                  nameKey={(entry) =>
                    `${entry.packageName} (${entry.pricingOptionInterval})`
                  }
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  labelLine={false}
                  label={(entry) => `${entry.percentage.toFixed(1)}%`}>
                  {revenueApiData.soldPlansPercentageChart.dataPoints.map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value.toFixed(2)}%`,
                    `Percentage`,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="analytics-container status-message">
            No revenue data available.
          </div>
        )}
      </div>

      {/* --- EXCEL REPORT SECTION --- */}
      <div className="section-title">REPORT FROM EXCEL FILE</div>
      {excelData ? (
        <>
          <div className="analytics-container">
            <h2 className="chart-title">Daily Overview</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={excelData.daily}
                margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-30} textAnchor="end" />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: "30px" }} />
                <Line
                  type="monotone"
                  dataKey="visits"
                  name="Total Visits"
                  stroke="#8884d8"
                />
                <Line
                  type="monotone"
                  dataKey="signUps"
                  name="Free Trial Sign-ups"
                  stroke="#82ca9d"
                />
                <Line
                  type="monotone"
                  dataKey="upgrades"
                  name="Premium Upgrades"
                  stroke="#ffc658"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="column-charts-area">
            <div className="analytics-container">
              <h2 className="chart-title">Overview (June 19 - July 31)</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={excelData.overview}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="analytics-container">
              <h2 className="chart-title">
                Conversion Metrics (June 19 - July 31)
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={excelData.conversion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Value" fill="#ff7300" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="analytics-container status-message">
          No Excel data available.
        </div>
      )}
    </div>
  )
}

export default ComprehensiveDashboard
