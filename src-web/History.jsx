import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function History() {
const [events, setEvents] = useState([]);

useEffect(() => {
    axios.get("http://127.0.0.1:8000/events").then((res) => {
    setEvents(res.data);
    });
}, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Historial de Eventos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((ev) => (
          <div key={ev.id} className="bg-gray-700 p-4 rounded-xl">
            <h3 className="text-xl font-bold">{ev.nombre}</h3>
            <p>💧 Watermark: {ev.watermark}</p>
            <p>🎨 Preset: {ev.preset}</p>
            <p>📐 Ratio: {ev.ratio}</p>
            <p>ID: {ev.id}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link
          to="/"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}

export default History;
