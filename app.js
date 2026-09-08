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

// Estos son los proveedores que ya tenías. Se usan SOLO una vez,
// para crearlos en la base de datos si todavía no existe ninguno.
const PROVEEDORES_INICIALES = [
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
const botonNuevoProveedor = document.getElementById("botonNuevoProveedor");
const formNuevoProveedor = document.getElementById("formNuevoProveedor");
const inputNuevoProveedor = document.getElementById("inputNuevoProveedor");
const botonArchivados = document.getElementById("botonArchivados");

let proveedorActivo = "Todos";
let listaProveedores = [];
let ultimosDatos = [];
let mostrandoArchivados = false;
let yaSembrado = false; // para no crear los proveedores iniciales más de una vez

const faltantesRef = collection(db, "faltantes");
const proveedoresRef = collection(db, "proveedores");

// --- Mostrar / ocultar el formulario de "nuevo proveedor" ---
botonNuevoProveedor.addEventListener("click", () => {
  formNuevoProveedor.classList.toggle("visible");
  inputNuevoProveedor.focus();
});

formNuevoProveedor.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const nombre = inputNuevoProveedor.value.trim().toUpperCase();
  if (nombre === "") return;

  // Evitamos duplicados (comparando en mayúsculas)
  const yaExiste = listaProveedores.some((p) => p.toUpperCase() === nombre);
  if (yaExiste) {
    alert("Ese proveedor ya existe.");
    return;
  }

  await addDoc(proveedoresRef, { nombre: nombre });
  inputNuevoProveedor.value = "";
  formNuevoProveedor.classList.remove("visible");
});

// --- Escuchamos los proveedores en tiempo real ---
onSnapshot(proveedoresRef, async (snapshot) => {
  if (snapshot.empty && !yaSembrado) {
    // No hay proveedores todavía: los creamos a partir de la lista inicial
    yaSembrado = true;
    for (const nombre of PROVEEDORES_INICIALES) {
      await addDoc(proveedoresRef, { nombre: nombre });
    }
    return; // el propio onSnapshot se va a volver a disparar solo, con los datos ya creados
  }

  listaProveedores = snapshot.docs
    .map((docSnap) => docSnap.data().nombre)
    .sort((a, b) => a.localeCompare(b));

  dibujarSelect();
  dibujarPestañas();
  dibujarLista(ultimosDatos);
});

function dibujarSelect() {
  selectProveedor.innerHTML = "";
  listaProveedores.forEach((nombre) => {
    const opcion = document.createElement("option");
    opcion.value = nombre;
    opcion.textContent = nombre;
    selectProveedor.appendChild(opcion);
  });
}

function dibujarPestañas() {
  // Borramos todo excepto el botón "+ Proveedor", que ya está fijo en el HTML
  pestañasDiv.querySelectorAll(".pestaña").forEach((el) => el.remove());

  const nombres = ["Todos", ...listaProveedores];

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

    // Insertamos cada pestaña ANTES del botón "+ Proveedor", para que ese quede siempre al final
    pestañasDiv.insertBefore(pestaña, botonNuevoProveedor);
  });
}

botonArchivados.addEventListener("click", () => {
  mostrandoArchivados = !mostrandoArchivados;
  botonArchivados.textContent = mostrandoArchivados ? "← Volver a faltantes" : "Ver archivados";
  dibujarLista(ultimosDatos);
});

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

function estaArchivado(item) {
  if (!item.llegado || !item.llegadoEn) return false;
  const ahora = Date.now();
  const fechaLlegada = item.llegadoEn.toMillis();
  return (ahora - fechaLlegada) > (DIAS_PARA_ARCHIVAR * MILISEGUNDOS_POR_DIA);
}

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

const consultaFaltantes = query(faltantesRef, orderBy("creado", "desc"));

onSnapshot(consultaFaltantes, (snapshot) => {
  ultimosDatos = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  dibujarLista(ultimosDatos);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
