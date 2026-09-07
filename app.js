// 1. Traemos las funciones de Firebase que necesitamos, desde internet (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// 2. Tu configuración de Firebase (la de tu proyecto "PEDIDOS VaaL")
const firebaseConfig = {
  apiKey: "AIzaSyDzyKXHwFNHsUrFLUYiPp2AKzoHR1uAXNI",
  authDomain: "pedidos-vaal.firebaseapp.com",
  projectId: "pedidos-vaal",
  storageBucket: "pedidos-vaal.firebasestorage.app",
  messagingSenderId: "398683633525",
  appId: "1:398683633525:web:3411395c3276bed350453c"
};

// 3. Inicializamos Firebase y la base de datos
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4. Buscamos los elementos del HTML que vamos a usar
const formulario = document.getElementById("formulario");
const inputItem = document.getElementById("inputItem");
const lista = document.getElementById("lista");

// 5. Referencia a la "colección" (carpeta) de Firestore donde viven los faltantes
const faltantesRef = collection(db, "faltantes");

// 6. Cuando se envía el formulario, agregamos un nuevo faltante
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // evita que la página se recargue

  const texto = inputItem.value.trim();
  if (texto === "") return; // si está vacío, no hace nada

  await addDoc(faltantesRef, {
    texto: texto,
    llegado: false,
    creado: serverTimestamp()
  });

  inputItem.value = ""; // limpiamos el cuadro de texto
});

// 7. Escuchamos cambios en tiempo real y dibujamos la lista
const consulta = query(faltantesRef, orderBy("creado", "desc"));

onSnapshot(consulta, (snapshot) => {
  lista.innerHTML = ""; // borramos la lista actual para redibujarla

  snapshot.forEach((docSnap) => {
    const item = docSnap.data();
    const id = docSnap.id;

    const li = document.createElement("li");
    if (item.llegado) {
      li.classList.add("llegado");
    }

    li.innerHTML = `
      <input type="checkbox" ${item.llegado ? "checked" : ""}>
      <span>${item.texto}</span>
    `;

    // Cuando se hace clic en el checkbox, marcamos como llegado/no llegado
    const checkbox = li.querySelector("input");
    checkbox.addEventListener("change", async () => {
      const itemRef = doc(db, "faltantes", id);
      await updateDoc(itemRef, { llegado: checkbox.checked });
    });

    lista.appendChild(li);
  });
});
