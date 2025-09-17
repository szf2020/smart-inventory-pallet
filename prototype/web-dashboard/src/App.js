import logo from './logo.svg';
import './App.css';
import './index.css';
import BottleDashboard from './dashboard';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <BottleDashboard />
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
      </header>
    </div>
  );
}

export default App;
