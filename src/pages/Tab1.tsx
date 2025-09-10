import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import type { Bird } from "../core/db/dao/birds";

export default function Tab1() {
  const [birds, setBirds] = useState<Bird[]>([]);

  useEffect(() => {
    const fetchBirds = async () => {
      const { data, error } = await supabase
        .from("birds")
        .select("*")
        .order("popularity", { ascending: false });
      if (error) {
        console.error("Error fetching birds:", error);
      } else {
        setBirds(data || []);
      }
    };
    fetchBirds();
  }, []);

  return (
    <div className="ion-padding">
      <h1>Birds</h1>
      {birds.map((b) => (
        <div key={b.id} style={{ marginBottom: "1rem" }}>
          <h2>{b.name}</h2>
          <p>{b.description}</p>
          {b.image_url && (
            <img
              src={b.image_url}
              alt={b.name}
              style={{ width: "100%", maxWidth: "300px" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
