import React, { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// --- CÁC HÀM HỖ TRỢ XỬ LÝ DỮ LIỆU ---

const parseDurationToSeconds = (durationStr) => {
  if (typeof durationStr !== "string") return 0
  const match = durationStr.match(/(\d+)\s*phút\s*(\d+)\s*giây/)
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
  }
  return 0
}

const parsePercentage = (percentageStr) => {
  if (typeof percentageStr !== "string") return 0
  return parseFloat(percentageStr.replace("%", ""))
}

const ComprehensiveDashboard = () => {
  // --- STATE CHO TỪNG BIỂU ĐỒ ---
  const [overviewTotalData, setOverviewTotalData] = useState([])
  const [conversionTotalData, setConversionTotalData] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDataAndProcess = async () => {
      try {
        const response = await fetch("/data.xlsx")
        if (!response.ok) throw new Error("Không thể tải file data.xlsx")
        const arrayBuffer = await response.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: "buffer" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })

        processAllData(rawData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDataAndProcess()
  }, [])

  const processAllData = (data) => {
    if (!Array.isArray(data) || data.length < 15) {
      setError("Dữ liệu từ file Excel không hợp lệ hoặc không đủ dòng.")
      return
    }

    // --- 1. XỬ LÝ DỮ LIỆU TỔNG "OVERVIEW" (CỘT D) ---
    const processedOverviewTotal = [
      {
        metric: "Total Visits",
        value: (data[3] && Number(data[2][3])) || 0,
      },
      {
        metric: "Avg. Duration (giây)",
        value: parseDurationToSeconds(data[3]?.[3]),
      },
      {
        metric: "Bounce Rate (%)",
        value: parsePercentage(data[4]?.[3]),
      },
    ]
    console.log(processedOverviewTotal)

    setOverviewTotalData(processedOverviewTotal)

    // --- 2. XỬ LÝ DỮ LIỆU TỔNG "CONVERSION METRICS" (CỘT D) ---
    const processedConversionTotal = [
      {
        metric: "Free Trial Sign-ups",
        value: (data[10] && Number(data[9][3])) || 0,
      },
      {
        metric: "Premium Upgrades",
        value: (data[11] && Number(data[10][3])) || 0,
      },
      {
        metric: "Conversion Rate (%)",
        value: parsePercentage(data[11]?.[3]),
      },
    ]
    setConversionTotalData(processedConversionTotal)

    // --- 3. XỬ LÝ DỮ LIỆU "THEO TỪNG NGÀY" ---
    const dailyRows = data.slice(15).filter((row) => row && row[0])
    const processedDailyData = dailyRows.map((row) => ({
      date: String(row[0]),
      visits: Number(row[1]) || 0,
      signUps: Number(row[2]) || 0,
      upgrades: Number(row[3]) || 0,
    }))
    setDailyData(processedDailyData)
  }

  if (loading) return <div className="status-message">Đang tải dữ liệu...</div>
  if (error) return <div className="status-message error">Lỗi: {error}</div>

  return (
    <div className="full-dashboard">
      {/* BIỂU ĐỒ LINE */}
      <div className="analytics-container">
        <h2 className="chart-title">Theo Từng Ngày</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={dailyData}
            margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" angle={-30} textAnchor="end" />
            <YAxis />
            <Tooltip />
            <Legend />
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

      {/* KHU VỰC CÁC BIỂU ĐỒ CỘT */}
      <div className="column-charts-area">
        {/* BIỂU ĐỒ OVERVIEW TỔNG */}
        <div className="analytics-container">
          <h2 className="chart-title">Tổng Quan (19/6 - 31/7)</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={overviewTotalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name="Giá trị" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* BIỂU ĐỒ CONVERSION TỔNG */}
        <div className="analytics-container">
          <h2 className="chart-title">Chỉ Số Chuyển Đổi (19/6 - 31/7)</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={conversionTotalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name="Giá trị" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default ComprehensiveDashboard
