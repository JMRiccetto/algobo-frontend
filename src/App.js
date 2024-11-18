import React, { useState, useEffect, useRef } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

const App = () => {
  const graphContainer = useRef(null);
  const [network, setNetwork] = useState(null);
  const [nextNodeId, setNextNodeId] = useState(1);
  const socket = useRef(null);

  useEffect(() => {

    socket.current = new WebSocket("ws://your-backend-url");

    socket.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketEvent(data);
    };

    socket.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    socket.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socket.current.close();
    };
  }, []);

  useEffect(() => {
    if (graphContainer.current) {
      const nodes = new DataSet();
      const edges = new DataSet();

      const networkInstance = new Network(
        graphContainer.current,
        { nodes, edges },
        {
          nodes: {
            shape: "circle",
            font: { color: "#343434" },
          },
          edges: {
            color: "#848484",
            width: 2,
            smooth: { type: "dynamic" },
            font: {
              size: 14,
              color: "#F0F0F0",
              align: "middle",
              strokeWidth: 0,
            },
          },
          physics: {
            enabled: true,
            stabilization: { iterations: 1000 },
          },
        }
      );

      setNetwork({ instance: networkInstance, nodes, edges });
    }
  }, []);

  const handleWebSocketEvent = (data) => {
    if (!network) return;

    const { type, payload } = data;
    switch (type) {
      case "ADD_NODE":
        addNodeFromEvent(payload);
        break;
      case "REMOVE_NODE":
        removeNodeFromEvent(payload);
        break;
      case "ADD_EDGE":
        addEdgeFromEvent(payload);
        break;
      case "REMOVE_EDGE":
        removeEdgeFromEvent(payload);
        break;
      default:
        console.warn("Unknown WebSocket event type:", type);
    }
  };

  const calculateColor = (powerUsage, powerLimit) => {
    if (powerLimit === 0) return "#00FF00";
    const usagePercentage = powerUsage / powerLimit;
    if (usagePercentage < 0.5) return "#00FF00";
    if (usagePercentage < 0.8) return "#FFFF00";
    return "#FF0000";
  };

  const addNodeFromEvent = ({ id, label, powerUsage, powerLimit }) => {
    const color = calculateColor(powerUsage, powerLimit);
    network.nodes.add({
      id,
      label,
      powerUsage,
      powerLimit,
      color: {
        background: color,
        border: color,
      },
    });
  };

  const removeNodeFromEvent = ({ id }) => {
    if (network.nodes.get(id)) {
      network.nodes.remove(id);
    }
  };

  const addEdgeFromEvent = ({ from, to, label }) => {
    if (network.nodes.get(from) && network.nodes.get(to)) {
      network.edges.add({ from, to, label });
    }
  };

  const removeEdgeFromEvent = ({ from, to }) => {
    const edge = network.edges.get({
      filter: (item) => item.from === from && item.to === to,
    });
    if (edge.length > 0) {
      network.edges.remove(edge[0].id);
    }
  };

  const addNode = () => {
    const label = prompt("Enter the label for the new node:");
    const powerUsage = parseFloat(prompt("Enter Power Usage:")) || 0;
    const powerLimit = parseFloat(prompt("Enter Power Limit:")) || 1;

    const newNode = {
      id: nextNodeId,
      label: label || `Node ${nextNodeId}`,
      powerUsage,
      powerLimit,
    };

    const color = calculateColor(powerUsage, powerLimit);

    network.nodes.add({
      ...newNode,
      color: {
        background: color,
        border: color,
      },
    });


    socket.current.send(
      JSON.stringify({ type: "ADD_NODE", payload: newNode })
    );

    setNextNodeId((id) => id + 1);
  };

  const removeNode = () => {
    const nodeId = parseInt(prompt("Enter Node ID to remove:"), 10);
    if (network.nodes.get(nodeId)) {
      network.nodes.remove(nodeId);
      socket.current.send(
        JSON.stringify({ type: "REMOVE_NODE", payload: { id: nodeId } })
      );
    } else {
      alert("Invalid Node ID!");
    }
  };

  const addEdge = () => {
    const from = parseInt(prompt("Enter source Node ID:"), 10);
    const to = parseInt(prompt("Enter destination Node ID:"), 10);
    const label = prompt("Enter edge label:");

    if (network.nodes.get(from) && network.nodes.get(to)) {
      network.edges.add({ from, to, label });
      socket.current.send(
        JSON.stringify({ type: "ADD_EDGE", payload: { from, to, label } })
      );
    } else {
      alert("Invalid Node IDs!");
    }
  };

  const removeEdge = () => {
    const from = parseInt(prompt("Enter source Node ID:"), 10);
    const to = parseInt(prompt("Enter destination Node ID:"), 10);

    const edge = network.edges.get({
      filter: (item) => item.from === from && item.to === to,
    });

    if (edge.length > 0) {
      network.edges.remove(edge[0].id);
      socket.current.send(
        JSON.stringify({ type: "REMOVE_EDGE", payload: { from, to } })
      );
    } else {
      alert("Edge not found!");
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div
        ref={graphContainer}
        style={{ width: "600px", height: "400px", margin: "auto" }}
      ></div>
      <div>
        <button onClick={addNode}>Add Node</button>
        <button onClick={removeNode}>Remove Node</button>
        <button onClick={addEdge}>Add Edge</button>
        <button onClick={removeEdge}>Remove Edge</button>
      </div>
    </div>
  );
};

export default App;
