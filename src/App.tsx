import { useUIStore } from './store/uiStore';
import { ImportScreen } from './screens/ImportScreen/ImportScreen';
import { ReviewScreen } from './screens/ReviewScreen/ReviewScreen';
import { DashboardScreen } from './screens/DashboardScreen/DashboardScreen';
import { ErrorBoundary } from './ErrorBoundary';
import './styles/global.css';

function Screen() {
  const currentScreen = useUIStore((s) => s.currentScreen);

  switch (currentScreen) {
    case 'review':
      return <ReviewScreen />;
    case 'dashboard':
      return <DashboardScreen />;
    case 'import':
    default:
      return <ImportScreen />;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Screen />
    </ErrorBoundary>
  );
}

export default App;
