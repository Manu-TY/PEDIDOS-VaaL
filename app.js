import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy
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
const botonPasarPedido = document.getElementById("botonPasarPedido");
const botonEliminarProveedor = document.getElementById("botonEliminarProveedor");
const botonArchivados = document.getElementById("botonArchivados");

let proveedorActivo = "Todos";
let listaProveedores = [];
let listaCortes = [];
let ultimosDatos = [];
let mostrandoArchivados = false;
let yaSembrado = false;

const faltantesRef = collection(db, "faltantes");
const proveedoresRef = collection(db, "proveedores");
const cortesRef = collection(db, "cortes");

// --- Nuevo proveedor ---
botonNuevoProveedor.addEventListener("click", () => {
  formNuevoProveedor.classList.toggle("visible");
  inputNuevoProveedor.focus();
});

formNuevoProveedor.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const nombre = inputNuevoProveedor.value.trim().toUpperCase();
  if (nombre === "") return;

  const yaExiste = listaProveedores.some((p) => p.nombre.toUpperCase() === nombre);
  if (yaExiste) {
    alert("Ese proveedor ya existe.");
    return;
  }

  await addDoc(proveedoresRef, { nombre: nombre });
  inputNuevoProveedor.value = "";
  formNuevoProveedor.classList.remove("visible");
});

// --- Borrar proveedor ---
async function borrarProveedor(prov) {
  const tienePendientes = ultimosDatos.some(
    (item) => item.proveedor === prov.nombre && !item.llegado
  );

  if (tienePendientes) {
    alert(`No se puede borrar "${prov.nombre}": todavía tiene faltantes pendientes. Resolvelos primero.`);
    return;
  }

  const confirmar = confirm(`¿Seguro que querés borrar el proveedor "${prov.nombre}"?`);
  if (!confirmar) return;

  await deleteDoc(doc(db, "proveedores", prov.id));

  if (proveedorActivo === prov.nombre) {
    proveedorActivo = "Todos";
  }
}

// --- Proveedores en tiempo real ---
onSnapshot(proveedoresRef, async (snapshot) => {
  if (snapshot.empty && !yaSembrado) {
    yaSembrado = true;
    for (const nombre of PROVEEDORES_INICIALES) {
      await addDoc(proveedoresRef, { nombre: nombre });
    }
    return;
  }

  listaProveedores = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, nombre: docSnap.data().nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  dibujarSelect();
  dibujarPestañas();
  actualizarBotonPasarPedido();
  dibujarLista(ultimosDatos);
});

function dibujarSelect() {
  selectProveedor.innerHTML = "";
  listaProveedores.forEach((prov) => {
    const opcion = document.createElement("option");
    opcion.value = prov.nombre;
    opcion.textContent = prov.nombre;
    selectProveedor.appendChild(opcion);
  });
}

function dibujarPestañas() {
  pestañasDiv.querySelectorAll(".pestaña").forEach((el) => el.remove());

  const nombres = ["Todos", ...listaProveedores.map((p) => p.nombre)];

  nombres.forEach((nombre) => {
    const pestaña = document.createElement("div");
    pestaña.classList.add("pestaña");
    pestaña.textContent = nombre;
    if (nombre === proveedorActivo) pestaña.classList.add("activa");

    pestaña.addEventListener("click", () => {
      proveedorActivo = nombre;
      dibujarPestañas();
      actualizarBotonPasarPedido();
      dibujarLista(ultimosDatos);
    });

    pestañasDiv.insertBefore(pestaña, botonNuevoProveedor);
  });
}

function actualizarBotonPasarPedido() {
  const debeVerse = proveedorActivo !== "Todos" && !mostrandoArchivados;
  botonPasarPedido.classList.toggle("visible", debeVerse);
  botonEliminarProveedor.classList.toggle("visible", debeVerse);
}

// --- Eliminar proveedor (desde botón aparte) ---
botonEliminarProveedor.addEventListener("click", () => {
  const prov = listaProveedores.find((p) => p.nombre === proveedorActivo);
  if (prov) borrarProveedor(prov);
});

// --- Pasar pedido (crear un corte) ---
botonPasarPedido.addEventListener("click", async () => {
  const pendientes = ultimosDatos.filter(
    (item) => item.proveedor === proveedorActivo && !item.llegado && !item.corteId
  );

  if (pendientes.length === 0) {
    alert("No hay faltantes nuevos para pasar a pedido en este proveedor.");
    return;
  }

  const nuevoCorte = await addDoc(cortesRef, {
    proveedor: proveedorActivo,
    fecha: serverTimestamp()
  });

  for (const item of pendientes) {
    await updateDoc(doc(db, "faltantes", item.id), { corteId: nuevoCorte.id });
  }
});

// --- Cortes en tiempo real ---
onSnapshot(query(cortesRef, orderBy("fecha", "asc")), (snapshot) => {
  listaCortes = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  dibujarLista(ultimosDatos);
});

// --- Ver archivados ---
botonArchivados.addEventListener("click", () => {
  mostrandoArchivados = !mostrandoArchivados;
  botonArchivados.textContent = mostrandoArchivados ? "← Volver a faltantes" : "Ver archivados";
  actualizarBotonPasarPedido();
  dibujarLista(ultimosDatos);
});

// --- Agregar faltante ---
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const texto = inputItem.value.trim();
  if (texto === "") return;

  await addDoc(faltantesRef, {
    texto: texto,
    proveedor: selectProveedor.value,
    llegado: false,
    llegadoEn: null,
    corteId: null,
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

function crearItemLi(item) {
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

  return li;
}

function dibujarLista(items) {
  lista.innerHTML = "";

  const filtrados = items
    .filter((item) => proveedorActivo === "Todos" || item.proveedor === proveedorActivo)
    .filter((item) => mostrandoArchivados ? estaArchivado(item) : !estaArchivado(item));

  if (proveedorActivo === "Todos" || mostrandoArchivados) {
    filtrados.forEach((item) => lista.appendChild(crearItemLi(item)));
    return;
  }

  const cortesDeEsteProveedor = listaCortes.filter((c) => c.proveedor === proveedorActivo);

  cortesDeEsteProveedor.forEach((corte, indice) => {
    const itemsDelCorte = filtrados
      .filter((item) => item.corteId === corte.id)
      .sort((a, b) => (a.creado?.toMillis() || 0) - (b.creado?.toMillis() || 0));

    if (itemsDelCorte.length === 0) return;

    const divisor = document.createElement("div");
    divisor.classList.add("divisor-corte");
    divisor.textContent = `Pedido ${indice + 1} — ${formatearFecha(corte.fecha)}`;
    lista.appendChild(divisor);

    itemsDelCorte.forEach((item) => lista.appendChild(crearItemLi(item)));
  });

  const sinPedir = filtrados
    .filter((item) => !item.corteId)
    .sort((a, b) => (a.creado?.toMillis() || 0) - (b.creado?.toMillis() || 0));

  if (sinPedir.length > 0) {
    const divisor = document.createElement("div");
    divisor.classList.add("divisor-corte");
    divisor.textContent = "Sin pedir todavía";
    lista.appendChild(divisor);

    sinPedir.forEach((item) => lista.appendChild(crearItemLi(item)));
  }
}

const consultaFaltantes = query(faltantesRef, orderBy("creado", "desc"));

onSnapshot(consultaFaltantes, (snapshot) => {
  ultimosDatos = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  dibujarLista(ultimosDatos);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
