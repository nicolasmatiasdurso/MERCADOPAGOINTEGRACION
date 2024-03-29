// Mercado_Pago_Router.js

const express = require("express");
const mercadopago = require("mercadopago");
const { db } = require("./firebaseConfig"); // Importa la instancia de Firestore
const { collection, addDoc } = require("firebase/firestore");

const Mercado_Pago = express.Router();

mercadopago.configure({
  access_token: process.env.ACCESS_TOKEN || "",
  client_id: process.env.MP_CLIENT_ID || "",
  client_secret: process.env.MP_CLIENT_SECRET || ""

});

Mercado_Pago.post("/", async (req, res) => {
  const carrito = req.body;

  const URL = "https://mercadopagointegracion-dev-nrhk.3.us-1.fl0.io";
  try {
    const items = carrito.map(producto => ({
      title: producto.titulo,
      unit_price: producto.precio,
      currency_id: "ARS",
      quantity: producto.cantidad,
    }));

    const preference = {
      items: items,

      auto_return: "approved",

      back_urls: {
        success: `${URL}`,
        failure: `${URL}`,
      },
      notification_url:`${URL}/notify`,
    };

    const respuesta = await mercadopago.preferences.create(preference);
    console.log(respuesta);
    res.status(200).json(respuesta.response.init_point);
  } catch (error) {
    console.error(error.message);
    res.status(500).json(error.message);
  }
});

// Agrega una nueva ruta para manejar las notificaciones de Mercado Pago
Mercado_Pago.post("/notify", async (req, res) => {
  const paymentId = req.body.data.id;
  
  try {
    // Utiliza el ID de pago para obtener los detalles de la transacción desde Mercado Pago
    const payment = await mercadopago.payment.get(paymentId);
    
    // Almacena la información en Firestore
    const pedidoRef = collection(db, "pedidos");

    const pedido = {
      payment_id: paymentId,
      monto: payment.transaction_amount,
      estado: payment.status,
      productos: payment.items.map(item => ({
        titulo: item.title,
        precio: item.unit_price,
        cantidad: item.quantity
      })),
      fecha: payment.date_approved 
    };

    // Guarda el pedido en Firestore
    await addDoc(pedidoRef, pedido);

    console.log("Pedido registrado en Firestore:", pedido);
    
    res.sendStatus(200);
  } catch (error) {
    console.error("Error al procesar la notificación de pago:", error);
    res.sendStatus(500);
  }
});

module.exports = Mercado_Pago;
