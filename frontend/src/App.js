import { BrowserRouter, Route } from 'react-router-dom';
import './App.css';
import Main from './pages/Main';

function App() {
  return (
    <BrowserRouter>
      <div className="grid-container">
        <header className="header">
          <a className="logo" href="/">
            Eye-tracker
          </a>
          <input className="menu-btn" type="checkbox" id="menu-btn" />
          <label className="menu-icon" htmlFor="menu-btn">
            <span className="navicon"></span>
          </label>
          <ul className="menu">
            <li>
              <a
                href="https://www.linux.ime.usp.br/~mattconce/mac0499/"
                className="link link-theme link-arrow"
              >
                TCC
              </a>
            </li>
            <li>
              <a href="#four" className="link link-theme link-arrow">
                Código
              </a>
            </li>
          </ul>
        </header>
        <main className="main">
          <div className="content">
            <Route path="/" exact={true} component={Main} />
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
