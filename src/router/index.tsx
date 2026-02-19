import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../app/AppLayout';
import { CalculatorPage } from '../pages/CalculatorPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <CalculatorPage /> },
      { path: '/my-savings', element: <PlaceholderPage title="My Savings" /> },
      {
        path: '/budget-planner',
        element: <PlaceholderPage title="Budget Planner" />,
      },
      { path: '/goals', element: <PlaceholderPage title="Goals" /> },
      { path: '/reports', element: <PlaceholderPage title="Reports" /> },
      { path: '/settings', element: <PlaceholderPage title="Settings" /> },
    ],
  },
]);
