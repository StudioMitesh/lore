import './index.css'
import { BrowserRouter as Router } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { Toaster } from "@/components/ui/sonner"
import { GoogleMapsLoader } from "@/components/GoogleMapsLoader"

const App = () => {
  return (
    <Router>
      <GoogleMapsLoader />
      <AppRoutes />
      <Toaster />
    </Router>
  )
}

export default App
