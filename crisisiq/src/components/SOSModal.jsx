import { useState, useEffect } from "react"

export default function SOSModal({ 
  isOpen, onClose 
}) {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [type, setType] = useState("Medical Emergency")
  const [description, setDescription] = useState("")
  const [phone, setPhone] = useState("")
  const [refId, setRefId] = useState("")

  // Generate ID on mount to keep render pure
  useEffect(() => {
    setRefId("SOS-2024-" + Math.floor(Math.random()*9000+1000))
  }, [])

  if (!isOpen) return null

  const handleSubmit = () => {
    setSubmitted(true)
    setTimeout(() => {
      onClose()
      setSubmitted(false)
    }, 5000)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px",
        overflowY: "auto"
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0D1B2A",
          border: "2px solid #FF1744",
          borderRadius: "10px",
          padding: "16px",
          width: "95%",
          maxWidth: "580px",
          position: "relative",
          margin: "auto"
        }}>

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "8px", right: "10px",
            background: "transparent",
            border: "none",
            color: "#9CA3AF",
            fontSize: "18px",
            cursor: "pointer"
          }}>
          ×
        </button>

        {!submitted ? (
          <div>
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <h2 style={{ color: "white", fontSize: "16px", fontWeight: "bold", margin: 0 }}>
                🚨 EMERGENCY SOS REQUEST
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full Name"
                style={inputStyle}
              />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Phone (Optional)"
                type="tel"
                style={inputStyle}
              />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Exact Location"
                style={{ ...inputStyle, gridColumn: "span 2" }}
              />
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                style={{ ...inputStyle, gridColumn: "span 2" }}>
                <option>Medical Emergency</option>
                <option>Flood / Water Crisis</option>
                <option>Food & Water Shortage</option>
                <option>Shelter Needed</option>
                <option>Missing Person</option>
                <option>Infrastructure Damage</option>
                <option>Landslide Emergency</option>
                <option>Other Emergency</option>
              </select>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of emergency..."
                rows={1}
                style={{ ...inputStyle, gridColumn: "span 2", resize: "none", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 2,
                  background: "#FF1744",
                  color: "white",
                  fontWeight: "bold",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  textTransform: "uppercase"
                }}>
                Submit SOS
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  color: "#9CA3AF",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "15px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
            <h2 style={{ color: "#00FF88", fontSize: "18px", fontWeight: "bold", margin: 0 }}>SOS Submitted!</h2>
            <p style={{ color: "#9CA3AF", marginTop: "8px", fontSize: "11px", margin: "4px 0" }}>Reference ID: <span style={{ color: "#00D4FF", fontFamily: "monospace", fontWeight: "bold" }}>{refId}</span></p>
            <div style={{ marginTop: "10px", padding: "10px", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", borderRadius: "6px" }}>
              <p style={{ color: "#00FF88", fontWeight: "600", fontSize: "13px", margin: 0 }}>✓ Dispatching nearest unit (4m)</p>
            </div>
            <p style={{ color: "#4B5563", fontSize: "10px", marginTop: "10px" }}>Auto-closing in 5s...</p>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  background: "#0A1628",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "6px",
  padding: "8px 12px",
  color: "white",
  width: "100%",
  outline: "none",
  fontSize: "12px",
  boxSizing: "border-box"
}
