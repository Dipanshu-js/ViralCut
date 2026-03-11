import { Suspense } from "react";
import FactoryClient from "./FactoryClient";

export default function FactoryPage() {
  return (
    <Suspense fallback={
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",gap:12,color:"var(--text-3)" }}>
        <div className="spin spin-lg" style={{ borderTopColor:"var(--brand)" }} />
        Loading factory...
      </div>
    }>
      <FactoryClient />
    </Suspense>
  );
}
