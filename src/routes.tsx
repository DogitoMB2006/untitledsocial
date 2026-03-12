import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Home from './pages/home/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import RequireAuth from './components/auth/RequireAuth'
import ProfilePage from './pages/profile/ProfilePage'
import ProfileSettingsPage from './pages/settings/ProfileSettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'u/:username',
        element: <ProfilePage />,
      },
      {
        path: 'settings/profile',
        element: (
          <RequireAuth>
            <ProfileSettingsPage />
          </RequireAuth>
        ),
      },
    ],
  },
])

