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

// --- HÀM HỖ TRỢ AN TOÀN ---
const parseDurationToSeconds = (durationStr) => {
  if (typeof durationStr !== "string") return 0
  const match = durationStr.match(/(\d+)\s*phút\s*(\d+)\s*giây/)
  return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 0
}

const parsePercentage = (percentageStr) => {
  if (typeof percentageStr !== "string") return 0
  return parseFloat(percentageStr.replace("%", "")) || 0
}

// Định dạng số thành tiền tệ
const formatCurrency = (value) => {
  if (typeof value !== "number") return "0 ₫"
  return `${value.toLocaleString("vi-VN")} ₫`
}

const ComprehensiveDashboard = () => {
  // --- STATE ---
  const [excelData, setExcelData] = useState(null)
  const [statisticApiData, setStatisticApiData] = useState(null)
  const [revenueApiData, setRevenueApiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    const fetchAllData = async () => {
      // Sử dụng Promise.allSettled để không bị dừng lại nếu một API lỗi
      const results = await Promise.allSettled([
        fetch("/data.xlsx"),
        fetch("/statistic.json"),
        fetch("/revenue.json"),
      ])

      const newErrors = []

      // Xử lý Excel
      if (results[0].status === "fulfilled" && results[0].value.ok) {
        const excelResponse = results[0].value
        const arrayBuffer = await excelResponse.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: "buffer" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })
        processExcelData(rawData)
      } else {
        newErrors.push("Không thể tải dữ liệu từ file Excel.")
      }

      // Xử lý API /statistic
      if (results[1].status === "fulfilled" && results[1].value.ok) {
        const statisticJson = await results[1].value.json()
        setStatisticApiData(statisticJson.data)
      } else {
        newErrors.push("Không thể tải dữ liệu thống kê")
      }

      // Xử lý API /revenue
      if (results[2].status === "fulfilled" && results[2].value.ok) {
        const revenueJson = await results[2].value.json()
        setRevenueApiData(revenueJson.data)
      } else {
        newErrors.push("Không thể tải dữ liệu doanh thu")
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

  // Xử lý dữ liệu cho biểu đồ kết hợp (Composed Chart)
  const combinedGrowthData =
    statisticApiData?.userGrowthOverTime.dataPoints.map((userPoint, index) => ({
      ...userPoint,
      revenue: statisticApiData.totalRevenue.dataPoints[index]?.revenue || 0,
    }))

  if (loading)
    return <div className="status-message">Đang tải toàn bộ dữ liệu...</div>

  return (
    <div className="full-dashboard">
      {errors.length > 0 && (
        <div className="analytics-container error-container">
          <h2 className="chart-title error-title">Thông báo lỗi</h2>
          <ul>
            {errors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --- KHU VỰC BÁO CÁO HỆ THỐNG (API) --- */}
      <div className="section-title">BÁO CÁO TỪ HỆ THỐNG</div>

      {/* KPI Cards */}
      {statisticApiData && revenueApiData && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <h3>Tổng Doanh Thu ({statisticApiData.filterYear})</h3>
            <p>{formatCurrency(revenueApiData.totalRevenueForYear)}</p>
          </div>
          <div className="kpi-card">
            <h3>Tổng Người Dùng</h3>
            <p>{statisticApiData.totalUsers.toLocaleString("vi-VN")}</p>
          </div>
          <div className="kpi-card">
            <h3>Doanh Thu Tháng Này</h3>
            <p>{formatCurrency(revenueApiData.currentMonthRevenue)}</p>
          </div>
          <div className="kpi-card">
            <h3>Tăng Trưởng Tháng Này</h3>
            <p>{revenueApiData.revenueGrowthRatePercentage.toFixed(2)}%</p>
          </div>
        </div>
      )}

      <div className="column-charts-area">
        {statisticApiData ? (
          <div className="analytics-container">
            <h2 className="chart-title">Tăng Trưởng Người Dùng & Doanh Thu</h2>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={combinedGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Doanh thu",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Người dùng",
                    angle: -90,
                    position: "insideRight",
                  }}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === "Doanh thu"
                      ? formatCurrency(value)
                      : value.toLocaleString("vi-VN")
                  }
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  yAxisId="left"
                  name="Doanh thu"
                  fill="#8884d8"
                />
                <Line
                  type="monotone"
                  dataKey="totalUsers"
                  yAxisId="right"
                  name="Người dùng"
                  stroke="#ff7300"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="analytics-container status-message">
            Không có dữ liệu thống kê.
          </div>
        )}

        {revenueApiData ? (
          <div className="analytics-container">
            <h2 className="chart-title">Tỉ lệ Các Gói Bán</h2>
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
                    `Tỉ lệ`,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="analytics-container status-message">
            Không có dữ liệu doanh thu.
          </div>
        )}
      </div>

      {/* --- KHU VỰC BÁO CÁO TỪ FILE EXCEL --- */}
      <div className="section-title">BÁO CÁO TỪ FILE EXCEL</div>
      {excelData ? (
        <>
          <div className="analytics-container">
            <h2 className="chart-title">Theo Từng Ngày</h2>
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
              <h2 className="chart-title">Tổng Quan (19/6 - 31/7)</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={excelData.overview}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Giá trị" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="analytics-container">
              <h2 className="chart-title">Chỉ Số Chuyển Đổi (19/6 - 31/7)</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={excelData.conversion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Giá trị" fill="#ff7300" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="analytics-container status-message">
          Không có dữ liệu từ file Excel.
        </div>
      )}
    </div>
  )
}

export default ComprehensiveDashboard
