import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminComplaints from '../pages/AdminComplaints';
import AdminToiletCreate from '../pages/AdminToiletCreate';
import AdminToiletRequests from '../pages/AdminToiletRequests';
import AdminToilets from '../pages/AdminToilets';
import ComplaintCreate from '../pages/ComplaintCreate';
import ComplaintDetails from '../pages/ComplaintDetails';
import Home from '../pages/Home';
import Login from '../pages/Login';
import MyComplaints from '../pages/MyComplaints';
import MyToiletRequests from '../pages/MyToiletRequests';
import Register from '../pages/Register';
import Toilets from '../pages/Toilets';
import ToiletDetails from '../pages/ToiletDetails';
import ToiletRequestCreate from '../pages/ToiletRequestCreate';
import ToiletRequestDetails from '../pages/ToiletRequestDetails';

function AppRoutes() {
  return (
    <Routes>
      {/* Module 1–4: unchanged. /toilets/:id already resolves either the
          Prisma id or the cleanConnectId (e.g. CC-PMC-0147) — this is
          exactly what a Module 6 QR code points at, so no new route was
          needed for QR scanning to work. */}
      <Route path="/" element={<Home />} />
      <Route path="/toilets" element={<Toilets />} />
      <Route path="/toilets/:id" element={<ToiletDetails />} />

      {/* Module 5: auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Module 5: complaints */}
      <Route
        path="/complaints/create"
        element={
          <ProtectedRoute role="CITIZEN">
            <ComplaintCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-complaints"
        element={
          <ProtectedRoute>
            <MyComplaints />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints/:id"
        element={
          <ProtectedRoute>
            <ComplaintDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/complaints"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminComplaints />
          </ProtectedRoute>
        }
      />

      {/* Module 6: missing-toilet registration requests (Workflow C) */}
      <Route
        path="/toilet-requests/create"
        element={
          <ProtectedRoute role="CITIZEN">
            <ToiletRequestCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-toilet-requests"
        element={
          <ProtectedRoute>
            <MyToiletRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/toilet-requests/:id"
        element={
          <ProtectedRoute>
            <ToiletRequestDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/toilet-requests"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminToiletRequests />
          </ProtectedRoute>
        }
      />

      {/* Module 6: admin direct toilet creation (Workflow 2) + QR
          management — separate from the citizen request workflow above,
          both ultimately go through the same createToilet backend path. */}
      <Route
        path="/admin/toilets"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminToilets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/toilets/new"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminToiletCreate />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
