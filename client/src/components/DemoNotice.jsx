import { USING_MOCK_API } from '../api'

export default function DemoNotice() {
  if (!USING_MOCK_API) return null
  return <aside className="demo-notice"><strong>Demo mode</strong><span>Starts with fictional expenses. Changes stay in this browser and are removed when its data is cleared. Express and PostgreSQL integration is planned.</span></aside>
}
