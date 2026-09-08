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

const PROVEEDORES = [
  "CROMOSOL", "CHEVROLET", "LIDERCAR", "KAVIGO", "DISTRIB OMAR",
  "FIAT", "RICARDO MR", "SABO", "AUTONAUTICA", "ALTRI",
  "PASTILLAS", "PEUGEOT", "PATTI", "KUARZO"
];

const DIAS_PARA_ARCHIVAR = 7;
const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

const formulario = document.getElementById("formulario");
const selectProveedor = document.getElementById("selectProveedor");
const inputItem = document.getElementById("inputItem");
const lista = document.getElementById("lista");
const pestañasDiv = document.getElementById("pestañas");
const botonArchivados = document.getElementById("botonArchivados");

let proveedorActivo = "Todos";
let ultimosDatos = [];
let mostrandoArchivados = false;

PROVEEDORES.forEach((nombre) => {
  const opcion = document.createElement("option");
  opcion.value = nombre;
  opcion.textContent = nombre;
  selectProveedor.appendChild(opcion);
});

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

// Al hacer clic en "Ver archivados" / "Ver activos", cambiamos de vista
botonArchivados.addEventListener("click", () => {
  mostrandoArchivados = !mostrandoArchivados;
  botonArchivados.textContent = mostrandoArchivados ? "← Volver a faltantes" : "Ver archivados";
  dibujarLista(ultimosDatos);
});

const faltantesRef = collection(db, "faltantes");

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const texto = inputItem.value.trim();
  if (texto === "") return;

  await addDoc(faltantesRef, {
    texto: texto,
    proveedor: selectProveedor.value,
    llegado: false,
    llegadoEn: null,
    creado: serverTimestamp()
  });

  inputItem.value = "";
});

// Calcula si un ítem llegado ya pasó los 7 días
function estaArchivado(item) {
  if (!item.llegado || !item.llegadoEn) return false;
  const ahora = Date.now();
  const fechaLlegada = item.llegadoEn.toMillis();
  return (ahora - fechaLlegada) > (DIAS_PARA_ARCHIVAR * MILISEGUNDOS_POR_DIA);
}

// Formatea la fecha en algo legible, ej: "05/09/2026"
function formatearFecha(timestamp) {
  if (!timestamp) return "";
  const fecha = timestamp.toDate();
  return fecha.toLocaleDateString("es-AR");
}

function dibujarLista(items) {
  lista.innerHTML = "";

  items
    .filter((item) => proveedorActivo === "Todos" || item.proveedor === proveedorActivo)
    .filter((item) => mostrandoArchivados ? estaArchivado(item) : !estaArchivado(item))
    .forEach((item) => {
      const li = document.createElement("li");
      if (item.llegado) li.classList.add("llegado");

      const infoFecha = item.llegado && item.llegadoEn
        ? `<span class="fecha">Llegó: ${formatearFecha(item.llegadoEn)}</span>`
        : "";

      li.innerHTML = `
        <input type="checkbox" ${item.llegado ? "checked" : ""} ${mostrandoArchivados ? "disabled" : ""}>
        <span class="texto">${item.texto}</span>
        ${infoFecha}
        <span class="proveedor">${item.proveedor || ""}</span>
      `;

      if (!mostrandoArchivados) {
        const checkbox = li.querySelector("input");
        checkbox.addEventListener("change", async () => {
          const itemRef = doc(db, "faltantes", item.id);
          await updateDoc(itemRef, {
            llegado: checkbox.checked,
            llegadoEn: checkbox.checked ? serverTimestamp() : null
          });
        });
      }

      lista.appendChild(li);
    });
}

const consulta = query(faltantesRef, orderBy("creado", "desc"));

onSnapshot(consulta, (snapshot) => {
  ultimosDatos = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  dibujarLista(ultimosDatos);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
