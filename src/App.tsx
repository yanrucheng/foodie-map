/** Root application shell. */
function App() {
  return (
    <>
      <header className="header">
        <h1 className="title">Foodie Map</h1>
        <p className="subtitle">Loading...</p>
      </header>
      <main className="map-shell">
        <div id="map"></div>
      </main>
    </>
  );
}

export default App;
