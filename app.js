import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDzyKXHwFNHsUrFLUYiPp2AKzoHR1uAXNI",
  authDomain: "pedidos-vaal.firebaseapp.com",
  projectId: "pedidos-vaal",
  storageBucket: "pedidos-vaal.firebasestorage.app",
  messagingSenderId: "398683633525",
  appId: "1:398683633525:web:3411395c3276bed350453c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// EDITÁ ESTA LISTA con tus proveedores reales (entre comillas, separados por coma)
const PROVEEDORES = [
  "CROMOSOL",
  "CHEVROLET",
  "LIDERCAR",
  "KAVIGO",
  "DISTRIB OMAR",
  "FIAT",
  "RICARDO MR",
  "SABO",
  "AUTONAUTICA",
  "ALTRI",
  "PASTILLAS",
  "PEUGEOT",
  "PATTI",
  "KUARZO"
];

const formulario = document.getElementById("formulario");
const selectProveedor = document.getElementById("selectProveedor");
const inputItem = document.getElementById("inputItem");
const lista = document.getElementById("lista");
const pestañasDiv = document.getElementById("pestañas");

let proveedorActivo = "Todos";
let ultimosDatos = [];

// Llenamos el <select> del formulario con los proveedores
PROVEEDORES.forEach((nombre) => {
  const opcion = document.createElement("option");
  opcion.value = nombre;
  opcion.textContent = nombre;
  selectProveedor.appendChild(opcion);
});

// Dibuja las pestañas: "Todos" + una por proveedor
function dibujarPestañas() {
  pestañasDiv.innerHTML = "";
  const nombres = ["Todos", ...PROVEEDORES];

  nombres.forEach((nombre) => {
    const pestaña = document.createElement("div");
    pestaña.textContent = nombre;
    pestaña.classList.add("pestaña");
    if (nombre === proveedorActivo) pestaña.classList.add("activa");

    pestaña.addEventListener("click", () => {
      proveedorActivo = nombre;
      dibujarPestañas();
      dibujarLista(ultimosDatos);
    });

    pestañasDiv.appendChild(pestaña);
  });
}
dibujarPestañas();

const faltantesRef = collection(db, "faltantes");

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const texto = inputItem.value.trim();
  if (texto === "") return;

  await addDoc(faltantesRef, {
    texto: texto,
    proveedor: selectProveedor.value,
    llegado: false,
    creado: serverTimestamp()
  });

  inputItem.value = "";
});

function dibujarLista(items) {
  lista.innerHTML = "";

  items
    .filter((item) => proveedorActivo === "Todos" || item.proveedor === proveedorActivo)
    .forEach((item) => {
      const li = document.createElement("li");
      if (item.llegado) li.classList.add("llegado");

      li.innerHTML = `
        <input type="checkbox" ${item.llegado ? "checked" : ""}>
        <span class="texto">${item.texto}</span>
        <span class="proveedor">${item.proveedor || ""}</span>
      `;

      const checkbox = li.querySelector("input");
      checkbox.addEventListener("change", async () => {
        const itemRef = doc(db, "faltantes", item.id);
        await updateDoc(itemRef, { llegado: checkbox.checked });
      });

      lista.appendChild(li);
    });
}

const consulta = query(faltantesRef, orderBy("creado", "desc"));

onSnapshot(consulta, (snapshot) => {
  ultimosDatos = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  dibujarLista(ultimosDatos);
});
