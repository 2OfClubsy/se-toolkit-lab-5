import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
)

const STORAGE_KEY = 'api_key'

interface Lab {
  id: string
  name: string
}

interface ScoreBucket {
  bucket: string
  count: number
}

interface ScoresResponse {
  lab_id: string
  buckets: ScoreBucket[]
}

interface TimelineEntry {
  date: string
  submissions: number
}

interface TimelineResponse {
  lab_id: string
  timeline: TimelineEntry[]
}

interface TaskPassRate {
  task_id: string
  task_name: string
  pass_rate: number
}

interface PassRatesResponse {
  lab_id: string
  tasks: TaskPassRate[]
}

type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

function Dashboard() {
  const [token] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [labs, setLabs] = useState<Lab[]>([])
  const [selectedLab, setSelectedLab] = useState<string>('')

  const [scoresState, setScoresState] = useState<FetchState<ScoresResponse>>({
    status: 'idle',
  })
  const [timelineState, setTimelineState] = useState<FetchState<TimelineResponse>>({
    status: 'idle',
  })
  const [passRatesState, setPassRatesState] = useState<FetchState<PassRatesResponse>>({
    status: 'idle',
  })

  // Fetch available labs
  useEffect(() => {
    if (!token) return

    fetch('/labs/', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: Lab[]) => {
        setLabs(data)
        if (data.length > 0 && !selectedLab) {
          setSelectedLab(data[0].id)
        }
      })
      .catch((err: Error) => {
        console.error('Failed to fetch labs:', err)
      })
  }, [token])

  // Fetch analytics data when lab selection changes
  useEffect(() => {
    if (!token || !selectedLab) return

    // Fetch scores
    setScoresState({ status: 'loading' })
    fetch(`/analytics/scores?lab=${selectedLab}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: ScoresResponse) =>
        setScoresState({ status: 'success', data }),
      )
      .catch((err: Error) =>
        setScoresState({ status: 'error', message: err.message }),
      )

    // Fetch timeline
    setTimelineState({ status: 'loading' })
    fetch(`/analytics/timeline?lab=${selectedLab}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: TimelineResponse) =>
        setTimelineState({ status: 'success', data }),
      )
      .catch((err: Error) =>
        setTimelineState({ status: 'error', message: err.message }),
      )

    // Fetch pass rates
    setPassRatesState({ status: 'loading' })
    fetch(`/analytics/pass-rates?lab=${selectedLab}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: PassRatesResponse) =>
        setPassRatesState({ status: 'success', data }),
      )
      .catch((err: Error) =>
        setPassRatesState({ status: 'error', message: err.message }),
      )
  }, [token, selectedLab])

  // Bar chart data for score buckets
  const barChartData =
    scoresState.status === 'success'
      ? {
          labels: scoresState.data.buckets.map((b) => b.bucket),
          datasets: [
            {
              label: 'Submissions',
              data: scoresState.data.buckets.map((b) => b.count),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            },
          ],
        }
      : { labels: [], datasets: [] }

  // Line chart data for timeline
  const lineChartData =
    timelineState.status === 'success'
      ? {
          labels: timelineState.data.timeline.map((t) => t.date),
          datasets: [
            {
              label: 'Submissions per Day',
              data: timelineState.data.timeline.map((t) => t.submissions),
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.3,
            },
          ],
        }
      : { labels: [], datasets: [] }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
      },
    },
  }

  if (!token) {
    return (
      <div className="dashboard">
        <h1>Dashboard</h1>
        <p>Please connect with your API key to view analytics.</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Analytics Dashboard</h1>
        <div className="lab-selector">
          <label htmlFor="lab-select">Select Lab: </label>
          <select
            id="lab-select"
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            disabled={labs.length === 0}
          >
            {labs.length === 0 ? (
              <option value="">Loading labs...</option>
            ) : (
              labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))
            )}
          </select>
        </div>
      </header>

      <div className="charts-container">
        <section className="chart-section">
          <h2>Score Distribution</h2>
          {scoresState.status === 'loading' && <p>Loading...</p>}
          {scoresState.status === 'error' && (
            <p className="error">Error: {scoresState.message}</p>
          )}
          {scoresState.status === 'success' && (
            <Bar options={chartOptions} data={barChartData} />
          )}
        </section>

        <section className="chart-section">
          <h2>Submissions Timeline</h2>
          {timelineState.status === 'loading' && <p>Loading...</p>}
          {timelineState.status === 'error' && (
            <p className="error">Error: {timelineState.message}</p>
          )}
          {timelineState.status === 'success' && (
            <Line options={chartOptions} data={lineChartData} />
          )}
        </section>
      </div>

      <section className="pass-rates-section">
        <h2>Pass Rates per Task</h2>
        {passRatesState.status === 'loading' && <p>Loading...</p>}
        {passRatesState.status === 'error' && (
          <p className="error">Error: {passRatesState.message}</p>
        )}
        {passRatesState.status === 'success' && (
          <table className="pass-rates-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Name</th>
                <th>Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {passRatesState.data.tasks.map((task) => (
                <tr key={task.task_id}>
                  <td>{task.task_id}</td>
                  <td>{task.task_name}</td>
                  <td>{(task.pass_rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default Dashboard
