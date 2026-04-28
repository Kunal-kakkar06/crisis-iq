import { Component } from "react"

export default class ErrorBoundary 
  extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error("CrisisIQ Error:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "400px",
          color: "white",
          background: "#0D1B2A",
          borderRadius: "12px",
          border: "1px solid rgba(255,69,0,0.3)",
          padding: "32px",
          textAlign: "center"
        }}>
          <div style={{fontSize:"48px",
            marginBottom:"16px"}}>🗺️</div>
          <h3 style={{fontSize:"18px",
            fontWeight:"bold",
            marginBottom:"8px"}}>
            Map Loading Issue
          </h3>
          <p style={{color:"#9CA3AF",
            fontSize:"13px",
            marginBottom:"20px"}}>
            The map encountered an error.
            This is usually a Google Maps 
            API key issue.
          </p>
          <button
            onClick={() => this.setState({
              hasError: false
            })}
            style={{
              background: "#00D4FF",
              color: "#000",
              border: "none",
              padding: "10px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold"
            }}>
            Retry Loading Map
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
