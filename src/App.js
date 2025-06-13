import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Sun, Compass, Sliders, ChevronsRight, MapPin, Calendar, Power, Maximize
} from 'lucide-react';

const loadSunCalcScript = (callback) => {
  if (window.SunCalc) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/suncalc/1.8.0/suncalc.min.js';
  script.onload = () => callback();
  script.onerror = () => console.error("Could not load SunCalc library.");
  document.body.appendChild(script);
};

const InputSlider = ({ icon: Icon, label, value, onChange, min, max, step, unit }) => (
  <div className="input-group">
    <label className="input-label">
      <Icon size={16} className="input-icon" />
      <span>{label}</span>
      <span className="input-value">{value}{unit}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
    />
  </div>
);

const InfoCard = ({ title, value, unit, icon: Icon }) => (
  <div className="info-card">
    <div className="icon-circle">
      <Icon size={24} />
    </div>
    <div>
      <p className="info-title">{title}</p>
      <p className="info-value">
        {value} <span className="info-unit">{unit}</span>
      </p>
    </div>
  </div>
);

export default function SolarCalculatorApp() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [date, setDate] = useState(new Date());
  const [latitude, setLatitude] = useState(39.93);
  const [longitude, setLongitude] = useState(32.85);
  const [panelTilt, setPanelTilt] = useState(30);
  const [panelOrientation, setPanelOrientation] = useState(180);
  const [panelEfficiency, setPanelEfficiency] = useState(15);
  const [panelArea, setPanelArea] = useState(1.5);
  const [hourlyData, setHourlyData] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    loadSunCalcScript(() => setIsScriptLoaded(true));
    navigator.geolocation.getCurrentPosition(position => {
      setLatitude(parseFloat(position.coords.latitude.toFixed(4)));
      setLongitude(parseFloat(position.coords.longitude.toFixed(4)));
      setIsLoadingLocation(false);
    }, () => {
      console.warn("Could not get user location. Using default.");
      setIsLoadingLocation(false);
    });
  }, []);

  const calculateEfficiency = useCallback(() => {
    if (!isScriptLoaded) return;

    const SunCalc = window.SunCalc;
    const data = [];
    const baseIrradiance = 1000;

    for (let hour = 0; hour < 24; hour++) {
      const currentHourDate = new Date(date);
      currentHourDate.setHours(hour, 0, 0, 0);

      const sunPos = SunCalc.getPosition(currentHourDate, latitude, longitude);
      const sunAltitude = sunPos.altitude;
      const sunAzimuth = sunPos.azimuth;

      const tiltRad = panelTilt * Math.PI / 180;
      const orientationRad = panelOrientation * Math.PI / 180;

      let power = 0;
      let effectiveIrradiance = 0;
      let angleOfIncidence = 90;

      if (sunAltitude > 0) {
        const cosAoi = Math.sin(sunAltitude) * Math.cos(tiltRad) +
          Math.cos(sunAltitude) * Math.sin(tiltRad) * Math.cos(sunAzimuth - orientationRad);

        if (cosAoi > 0) {
          angleOfIncidence = Math.acos(cosAoi) * 180 / Math.PI;
          effectiveIrradiance = baseIrradiance * cosAoi;
          power = effectiveIrradiance * panelArea * (panelEfficiency / 100);
        }
      }

      data.push({
        hour: `${hour}:00`,
        sunAltitude: (sunAltitude * 180 / Math.PI).toFixed(2),
        sunAzimuth: ((sunAzimuth * 180 / Math.PI) + 180).toFixed(2),
        angleOfIncidence: angleOfIncidence.toFixed(2),
        power: power > 0 ? power.toFixed(2) : 0,
      });
    }

    setHourlyData(data);
  }, [isScriptLoaded, date, latitude, longitude, panelTilt, panelOrientation, panelEfficiency, panelArea]);

  useEffect(() => {
    calculateEfficiency();
  }, [calculateEfficiency]);

  const summaryStats = useMemo(() => {
    const peakPower = Math.max(...hourlyData.map(d => parseFloat(d.power) || 0));
    const totalEnergy = hourlyData.reduce((sum, d) => sum + (parseFloat(d.power) || 0), 0) / 1000;
    const operatingHours = hourlyData.filter(d => parseFloat(d.power) > 0).length;

    return {
      peakPower: peakPower.toFixed(2),
      totalEnergy: totalEnergy.toFixed(3),
      operatingHours
    };
  }, [hourlyData]);

  const getOrientationLabel = (angle) => {
    if (angle > 337.5 || angle <= 22.5) return 'N';
    if (angle > 22.5 && angle <= 67.5) return 'NE';
    if (angle > 67.5 && angle <= 112.5) return 'E';
    if (angle > 112.5 && angle <= 157.5) return 'SE';
    if (angle > 157.5 && angle <= 202.5) return 'S';
    if (angle > 202.5 && angle <= 247.5) return 'SW';
    if (angle > 247.5 && angle <= 292.5) return 'W';
    if (angle > 292.5 && angle <= 337.5) return 'NW';
    return '';
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">
          <Sun size={40} />
          Hourly Solar Panel Efficiency Calculator
        </h1>
        <p className="app-description">
          Analyze the potential power output for your transparent solar panels based on building and environmental factors.
        </p>
      </div>

      <div className="main-grid">
        <div className="card">
          <h2>Panel Configuration</h2>

          <div className="input-group">
            <label className="input-label">
              <Calendar size={16} className="input-icon" />
              Date
            </label>
            <input
              type="date"
              value={date.toISOString().split('T')[0]}
              onChange={e => setDate(new Date(e.target.value))}
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <MapPin size={16} className="input-icon" />
              Location (Lat, Lon)
              {isLoadingLocation && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>(Getting location...)</span>}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="number" value={latitude} onChange={e => setLatitude(parseFloat(e.target.value))} />
              <input type="number" value={longitude} onChange={e => setLongitude(parseFloat(e.target.value))} />
            </div>
          </div>

          <InputSlider icon={ChevronsRight} label="Panel Tilt" value={panelTilt} onChange={setPanelTilt} min={0} max={90} step={1} unit="°" />
          <InputSlider icon={Compass} label={`Orientation (${getOrientationLabel(panelOrientation)})`} value={panelOrientation} onChange={setPanelOrientation} min={0} max={360} step={1} unit="°" />
          <InputSlider icon={Sliders} label="Panel Efficiency" value={panelEfficiency} onChange={setPanelEfficiency} min={1} max={40} step={0.5} unit="%" />
          <InputSlider icon={Maximize} label="Panel Area" value={panelArea} onChange={setPanelArea} min={0.1} max={10} step={0.1} unit=" m²" />
        </div>

        <div>
          <div className="info-cards">
            <InfoCard title="Peak Power" value={summaryStats.peakPower} unit="Watts" icon={Power} />
            <InfoCard title="Total Daily Energy" value={summaryStats.totalEnergy} unit="kWh" icon={Power} />
            <InfoCard title="Sunlight Hours" value={summaryStats.operatingHours} unit="hours" icon={Sun} />
          </div>

          <div className="card">
            <h3>Hourly Power Output (Watts)</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="power" name="Power (W)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3>Detailed Hourly Data</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Hour</th>
                    <th>Power (W)</th>
                    <th>Sun Altitude (°)</th>
                    <th>Sun Azimuth (°)</th>
                    <th>Incidence Angle (°)</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyData.map((d, i) => (
                    <tr key={i}>
                      <td>{d.hour}</td>
                      <td className="power-value">{d.power}</td>
                      <td>{d.sunAltitude}</td>
                      <td>{d.sunAzimuth}</td>
                      <td>{d.angleOfIncidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

