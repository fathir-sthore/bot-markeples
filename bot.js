const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// === BOT SETTINGS ===
const token = process.env.BOT_TOKEN || "8006036069:AAFij9OrS-dwNrGPoUtibEgVx6dUGMpaJAM";
const ownerId = parseInt(process.env.OWNER_ID) || 8460407056;
const ownerUsername = process.env.OWNER_USERNAME || "fathirsthore";

// Payment information
const danaNumber = "0882003493812";
const gopayNumber = "08895668901";
const qrisLink = "https://files.catbox.moe/gwkb7r.jpg";

// Product database
const products = {
  "panel": {
    "reseller": {
      name: "RESELLER PANEL",
      price: "4.000",
      description: "Bisa jual panel, bisa create panel sesukamu, dapat sc pushkontak", 
      productLink: "https://t.me/fathirpeterolidan"
    },
    "admin panel": {
      name: "ADMIN PANEL",
      price: "8.000",
      description: "Buka reseller, dapat sc cpanel via telegram/WhatsApp, dapat func bug news", 
      productLink: "https://t.me/fathirpeterolidan"
    },
    "partner panel": {
      name: "PARTNER PANEL",
      price: "15.000",
      description: "Buka admin panel, akses 75% bot cpanel, dapat base sc bug", 
      productLink: "https://t.me/fathirpeterolidan"
    }, 
    "CEO": {
      name: "CEO PANEL", 
      price: "25.000",
      description: "Buka partner panel, dapat mt ben new, dapat 2-3k dari buyer, akses 100% bot cpanel", 
      productLink: "https://t.me/fathirpeterolidan"
    }
  },
  "script": {
    "sc cpanel v2.3": {
      name: "FATHIR CPANEL V2.3", 
      price: "10.000",
      description: "All delete server, all delete username, download menu, henetih menu, only group chat", 
      productLink: "https://www.mediafire.com/file/j0775x6xhygnrdt/FATHIR_V2.zip/file"
    }, 
    "Base sc cpanel via wa": {
      name: "BASE SC CPANEL VIA WA", 
      price: "10.000",
      description: "All fitur fix, support all WA, belis new, all no enc", 
      productLink: "https://www.mediafire.com/file/nmlfph7zgplff9o/BASH_SC_CPANEL_VIA_WA.zip/file"
    }, 
    "Base sc cpanel via telegram": {
      name: "BASE SC CPANEL VIA TELEGRAM", 
      price: "10.000",
      description: "Base no enc, sudah ada addo, all delete panel, fitur install VPS fix", 
      productLink: "https://www.mediafire.com/file/m44r25zuxzakwjc/BASH_CPANEL_VIA_TELE.zip/file"
    }, 
    "base sc bug wa": {
      name: "BASE SC BUG WHATSAPP",
      price: "14.000",
      description: "Sudah ada function, all fitur tambahan fix, button, support all WA, tampilan keren", 
      productLink: "https://www.mediafire.com/file/15mns4ew1lpnjw3/Bash_bug_via_wa.zip/file"
    }, 
    "base sc bug tele": {
      name: "BASE SC BUG TELEGRAM",
      price: "14.000",
      description: "Sudah ada function, all fitur tambahan fix, button, tampilan keren", 
      productLink: "https://www.mediafire.com/file/vzouh7w5yq8oycp/%25F0%259D%2590%2593%25F0%259D%2590%2587%25F0%259D%2590%2584_%25F0%259D%2590%2598%25E1%25B3%25A5%25F0%259D%2590%258E%25E1%25B7%2588%25F0%259D%2590%258D%25E1%25B3%2598%25F0%259D%2590%258D%25E1%25B3%2591_%25F0%259D%2590%2588%25E1%25B3%25A0%25F0%259D%2590%258D%25E1%25B3%25A2%25F0%259D%2590%2585%25E1%25B3%25A4%25F0%259D%2590%2588%25F0%259D%2590%258D%25F0%259D%2590%2593%25E1%25B3%2592%25F0%259D%2590%2598%25E1%25B3%2596_%25F0%259D%2590%2595%25F0%259D%259F%2593_%25F0%259D%259F%258E_%25E2%2598%25AC_NEW_DB_ser_%2528%25F0%259D%2590%2581%25F0%259D%2590%25B2_%25F0%259D%2590%258D%25F0%259D%2590%25A8_%25F0%259D%2590%258D%25F0%259D%2590%259A%25F0%259D%2590%25A6%25F0%259D%2590%259E%2529_.zip/file"
    }
  }
};

// Inisialisasi bot dengan webhook
const bot = new TelegramBot(token);

// Data storage (akan hilang saat cold start, pertimbangkan database)
let userPaymentMethod = {};
let userSelectedProduct = {};
let userPendingPayments = {};
let waitingForPhoto = {};
let forwardedMessages = {};
let lastWelcomeMessage = {};
let tempMessagesToDelete = {};

// === HELPER FUNCTIONS ===
async function deleteAfterDelay(chatId, messageId, delay = 30000) {
  setTimeout(async () => {
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (err) {
      console.error("Gagal menghapus pesan:", err.message);
    }
  }, delay);
}

function saveTransactionHistory(paymentId, userId, username, product, method, productLink) {
  const historyEntry = {
    date: new Date().toISOString(),
    paymentId,
    userId,
    username,
    product: product.name,
    price: product.price,
    method,
    productLink
  };
  
  const historyFile = '/tmp/transactions.json'; // Gunakan /tmp di Vercel
  let history = [];
  
  try {
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile));
    }
    history.push(historyEntry);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Failed to save transaction:', err);
  }
}

// === MESSAGE HANDLERS ===
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const sent = await bot.sendMessage(chatId, "Memuat menu...");
    lastWelcomeMessage[chatId] = sent.message_id;
    
    if (userId === ownerId) {
      await sendOwnerMenu(chatId);
    } else {
      await sendWelcomeMenu(chatId);
    }
  } catch (err) {
    console.error("Error in /start:", err);
  }
});

bot.onText(/\/fathir/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId === ownerId) {
    await sendOwnerMenu(chatId);
  } else {
    const notif = await bot.sendMessage(chatId, "⚠️ Maaf, perintah ini hanya untuk owner.");
    deleteAfterDelay(chatId, notif.messageId);
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const username = callbackQuery.from.username || "No username";
  const userId = callbackQuery.from.id;

  try {
    // Hapus pesan loading sebelumnya jika ada
    if (tempMessagesToDelete[chatId]) {
      await bot.deleteMessage(chatId, tempMessagesToDelete[chatId]).catch(() => {});
      delete tempMessagesToDelete[chatId];
    }

    // Kirim pesan loading baru
    const loadingMsg = await bot.sendMessage(chatId, "Memuat...");
    tempMessagesToDelete[chatId] = loadingMsg.message_id;

    if (data === "back_to_main") {
      if (userId === ownerId) {
        await sendOwnerMenu(chatId);
      } else {
        await sendWelcomeMenu(chatId);
      }
      return;
    }

    if (data === "list_categories") {
      await sendProductCategories(chatId);
      return;
    }

    if (data.startsWith("category_")) {
      const category = data.replace("category_", "");
      await sendProductList(chatId, category);
      return;
    }

    if (data.startsWith("select_product_")) {
      const parts = data.split("_");
      const category = parts[2];
      const productId = parts.slice(3).join("_");
      const product = products[category][productId];
      
      if (!product) {
        const notif = await bot.sendMessage(chatId, "⚠️ Produk tidak ditemukan.");
        deleteAfterDelay(chatId, notif.message_id);
        return;
      }
      
      userSelectedProduct[userId] = product;
      await sendProductDetail(chatId, product);
      return;
    }

    if (data === "pay_dana" || data === "pay_gopay" || data === "pay_qris") {
      await handlePaymentMethod(data, chatId, userId);
      return;
    }

    if (data === "done_payment") {
      await handlePaymentConfirmation(chatId, userId, username);
      return;
    }

    if (data.startsWith("confirm_payment_")) {
      const paymentId = data.replace("confirm_payment_", "");
      await handleOwnerConfirmation(paymentId, chatId, true);
      return;
    }

    if (data.startsWith("reject_payment_")) {
      const paymentId = data.replace("reject_payment_", "");
      await handleOwnerConfirmation(paymentId, chatId, false);
      return;
    }

    if (data === "view_pending_payments") {
      await viewPendingPayments(chatId);
      return;
    }

    if (data.startsWith("reply_")) {
      const targetUserId = data.replace("reply_", "");
      const replyMsg = await bot.sendMessage(chatId, `Silakan ketik pesan balasan untuk user ID ${targetUserId}:`);
      tempMessagesToDelete[chatId] = replyMsg.message_id;
      return;
    }

  } catch (error) {
    console.error("Error handling callback:", error);
    const errorMsg = await bot.sendMessage(chatId, "⚠️ Terjadi kesalahan. Silakan coba lagi.");
    deleteAfterDelay(chatId, errorMsg.message_id);
  } finally {
    // Pastikan pesan loading dihapus
    if (tempMessagesToDelete[chatId]) {
      await bot.deleteMessage(chatId, tempMessagesToDelete[chatId]).catch(() => {});
      delete tempMessagesToDelete[chatId];
    }
    
    // Jawab callback query untuk menghilangkan "loading" di button
    await bot.answerCallbackQuery(callbackQuery.id);
  }
});

bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (waitingForPhoto[userId]) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const callback = waitingForPhoto[userId];
    delete waitingForPhoto[userId];
    callback(fileId);
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || "No username";
  const text = msg.text || "";
  const messageId = msg.message_id;
  
  // Skip commands or messages from owner
  if (text.startsWith('/') || userId === ownerId) return;
  if (msg.photo && waitingForPhoto[userId]) return;

  // Forward message to owner
  try {
    if (msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const forwarded = await bot.sendPhoto(ownerId, fileId, {
        caption: `📩 Pesan dari @${username} (ID: ${userId})`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔵 Balas Pesan", callback_data: `reply_${userId}` }]
          ]
        }
      });
      forwardedMessages[forwarded.message_id] = { userId, originalMsgId: messageId };
    } else if (text) {
      const forwarded = await bot.sendMessage(ownerId, `📩 Pesan dari @${username} (ID: ${userId}):\n\n${text}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔵 Balas Pesan", callback_data: `reply_${userId}` }]
          ]
        }
      });
      forwardedMessages[forwarded.message_id] = { userId, originalMsgId: messageId };
    }
    
    const notif = await bot.sendMessage(chatId, "Pesan Anda telah diteruskan ke owner. Terima kasih!");
    deleteAfterDelay(chatId, notif.message_id);
  } catch (err) {
    console.error("Error forwarding message:", err);
  }
});

bot.on("reply_to_message", async (msg) => {
  if (msg.from.id !== ownerId) return;
  
  const repliedMsg = msg.reply_to_message;
  if (!repliedMsg) return;
  
  const forwardedData = Object.entries(forwardedMessages).find(
    ([, data]) => data.originalMsgId === repliedMsg.message_id
  );
  
  if (!forwardedData) return;
  
  const [, { userId }] = forwardedData;
  const replyText = msg.text || "";
  
  try {
    await bot.sendMessage(userId, `📩 Balasan dari owner:\n\n${replyText}`);
    const notif = await bot.sendMessage(ownerId, "✅ Pesan balasan telah dikirim ke user.");
    deleteAfterDelay(ownerId, notif.message_id);
  } catch (err) {
    console.error("Failed to send reply:", err);
    const errorNotif = await bot.sendMessage(ownerId, "⚠️ Gagal mengirim balasan ke user.");
    deleteAfterDelay(ownerId, errorNotif.message_id);
  }
});

bot.onText(/\/balas (\d+) (.+)/, (msg, match) => {
  if (msg.from.id !== ownerId) return;
  
  const userId = match[1];
  const replyText = match[2];
  
  bot.sendMessage(userId, `📩 Balasan dari owner:\n\n${replyText}`)
    .then(() => {
      bot.sendMessage(ownerId, "✅ Pesan balasan telah dikirim.");
    })
    .catch(err => {
      console.error("Gagal mengirim balasan:", err);
      bot.sendMessage(ownerId, "⚠️ Gagal mengirim balasan. User mungkin belum memulai chat dengan bot.");
    });
});

// === MENU FUNCTIONS ===
async function sendWelcomeMenu(chatId) {
  try {
    await bot.sendPhoto(chatId, "https://files.catbox.moe/sa3upd.jpg", {
      caption: `\`\`\`
Selamat datang di Marketplace Fathir
Order via bot, bot ini masih dalam masa pengembangan
Developer: @fathirsthore
Informasi: @fathirsthoreinformasine
\`\`\``,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 Lihat Produk", callback_data: "list_categories" }],
          [{ text: "📡Chanel owner", url: `https://t.me/fathirsthoreinformasine` }]
        ],
      },
    });
    
    if (lastWelcomeMessage[chatId]) {
      await bot.deleteMessage(chatId, lastWelcomeMessage[chatId]).catch(() => {});
      delete lastWelcomeMessage[chatId];
    }
  } catch (err) {
    console.error("Error sending welcome menu:", err);
    await bot.sendMessage(chatId, "Selamat datang di Marketplace Fathir", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 Lihat Produk", callback_data: "list_categories" }],
          [{ text: "📡Chanel owner", url: `https://t.me/fathirsthoreinformasine` }]
        ],
      }
    });
  }
}

async function sendOwnerMenu(chatId) {
  try {
    await bot.sendMessage(chatId, "👑 *Menu Owner*", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Lihat Pembayaran Tertunda", callback_data: "view_pending_payments" }],
          [{ text: "🔙 Kembali ke Menu Utama", callback_data: "back_to_main" }]
        ]
      }
    });
    
    if (lastWelcomeMessage[chatId]) {
      await bot.deleteMessage(chatId, lastWelcomeMessage[chatId]).catch(() => {});
      delete lastWelcomeMessage[chatId];
    }
  } catch (err) {
    console.error("Error sending owner menu:", err);
  }
}

async function sendProductCategories(chatId) {
  try {
    await bot.sendMessage(chatId, "📋 Pilih Kategori Produk:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "PANEL", callback_data: "category_panel" }],
          [{ text: "SCRIPT", callback_data: "category_script" }],
          [{ text: "🔙 Kembali", callback_data: "back_to_main" }]
        ]
      }
    });
  } catch (err) {
    console.error("Error sending product categories:", err);
    const notif = await bot.sendMessage(chatId, "⚠️ Gagal memuat kategori produk.");
    deleteAfterDelay(chatId, notif.message_id);
  }
}

async function sendProductList(chatId, category) {
  try {
    const categoryProducts = products[category];
    if (!categoryProducts) {
      const notif = await bot.sendMessage(chatId, "⚠️ Kategori tidak ditemukan.");
      deleteAfterDelay(chatId, notif.message_id);
      return;
    }

    const productButtons = Object.keys(categoryProducts).map(productId => {
      const product = categoryProducts[productId];
      return [{
        text: `${product.name} - Rp${product.price}`,
        callback_data: `select_product_${category}_${productId}`
      }];
    });
    
    await bot.sendMessage(chatId, `📋 Daftar Produk ${category.toUpperCase()}:`, {
      reply_markup: {
        inline_keyboard: [
          ...productButtons,
          [{ text: "🔙 Kembali", callback_data: "list_categories" }]
        ]
      }
    });
  } catch (err) {
    console.error("Error sending product list:", err);
    const notif = await bot.sendMessage(chatId, "⚠️ Gagal memuat daftar produk.");
    deleteAfterDelay(chatId, notif.message_id);
  }
}

async function sendProductDetail(chatId, product) {
  try {
    await bot.sendMessage(chatId, 
      `📋 Detail Produk:\n\n` +
      `📛 Nama: ${product.name}\n` +
      `💵 Harga: Rp${product.price}\n` +
      `📝 Deskripsi: ${product.description}\n\n` +
      `Silakan pilih metode pembayaran:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "☇ ＤＡＮＡ", callback_data: "pay_dana" }],
            [{ text: "☇ ＧＯＰＡＹ", callback_data: "pay_gopay" }],
            [{ text: "☇ ＬＩＮＫ ＱＲＩＳ", callback_data: "pay_qris" }],
            [{ text: "🔙 Kembali", callback_data: "list_categories" }]
          ]
        }
      }
    );
  } catch (err) {
    console.error("Error sending product detail:", err);
    const notif = await bot.sendMessage(chatId, "⚠️ Gagal memuat detail produk.");
    deleteAfterDelay(chatId, notif.message_id);
  }
}

async function handlePaymentMethod(data, chatId, userId) {
  try {
    const method = data.replace("pay_", "");
    userPaymentMethod[userId] = method.toUpperCase();
    const product = userSelectedProduct[userId];
    
    if (!product) {
      const notif = await bot.sendMessage(chatId, "⚠️ Silakan pilih produk terlebih dahulu.");
      deleteAfterDelay(chatId, notif.message_id);
      return;
    }

    const productInfo = `\n\n📦 Produk: ${product.name}\n💵 Harga: Rp${product.price}`;
    
    if (method === "dana") {
      await bot.sendMessage(chatId, `Nomor DANA: \`${danaNumber}\`${productInfo}`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 Salin Nomor DANA", url: `tg://copy?text=${danaNumber}` }],
            [{ text: "✅ Selesai Transfer", callback_data: "done_payment" }],
            [{ text: "🔙 Kembali", callback_data: "back_to_main" }]
          ]
        }
      });
    } else if (method === "gopay") {
      await bot.sendMessage(chatId, `Nomor GOPAY: \`${gopayNumber}\`${productInfo}`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 Salin Nomor GOPAY", url: `tg://copy?text=${gopayNumber}` }],
            [{ text: "✅ Selesai Transfer", callback_data: "done_payment" }],
            [{ text: "🔙 Kembali", callback_data: "back_to_main" }]
          ]
        }
      });
    } else if (method === "qris") {
      try {
        await bot.sendPhoto(chatId, qrisLink, {
          caption: `Silakan scan QRIS di atas untuk melakukan pembayaran.${productInfo}`,
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Selesai Transfer", callback_data: "done_payment" }],
              [{ text: "🔙 Kembali", callback_data: "back_to_main" }]
            ]
          }
        });
      } catch (err) {
        console.error("Gagal mengirim QRIS:", err);
        const errorMsg = await bot.sendMessage(chatId, `⚠️ Gagal mengirim QRIS. Silakan gunakan link ini: ${qrisLink}`);
        deleteAfterDelay(chatId, errorMsg.message_id);
      }
    }
  } catch (err) {
    console.error("Error handling payment method:", err);
    const notif = await bot.sendMessage(chatId, "⚠️ Gagal memproses metode pembayaran.");
    deleteAfterDelay(chatId, notif.message_id);
  }
}

async function handlePaymentConfirmation(chatId, userId, username) {
  const method = userPaymentMethod[userId] || "Unknown";
  const product = userSelectedProduct[userId];
  
  if (!product) {
    const notif = await bot.sendMessage(chatId, "⚠️ Silakan pilih produk terlebih dahulu.");
    deleteAfterDelay(chatId, notif.message_id);
    return;
  }

  const loadingMsg = await bot.sendMessage(chatId, "Silakan kirim bukti transfer (foto) di sini.");
  tempMessagesToDelete[chatId] = loadingMsg.message_id;
  
  try {
    const fileId = await new Promise((resolve, reject) => {
      waitingForPhoto[userId] = resolve;
      
      setTimeout(() => {
        if (waitingForPhoto[userId]) {
          delete waitingForPhoto[userId];
          reject(new Error("Waktu menunggu bukti transfer habis"));
        }
      }, 300000);
    });

    const paymentId = `payment_${userId}_${Date.now()}`;
    userPendingPayments[paymentId] = {
      userId,
      username,
      product,
      method,
      fileId,
      chatId
    };
    
    await bot.sendPhoto(ownerId, fileId, {
      caption: `💰 *Pembayaran Baru Menunggu Konfirmasi*\n\n` +
        `🆔 Payment ID: ${paymentId}\n` +
        `👤 Username: @${username}\n` +
        `🆔 User ID: ${userId}\n` +
        `📦 Produk: ${product.name}\n` +
        `💵 Harga: Rp${product.price}\n` +
        `💳 Metode: ${method}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Ya (Terima)", callback_data: `confirm_payment_${paymentId}` },
            { text: "❌ Tidak (Tolak)", callback_data: `reject_payment_${paymentId}` }
          ]
        ]
      }
    });
    
    const notif = await bot.sendMessage(chatId, "✅ Bukti transfer telah dikirim ke owner dan menunggu konfirmasi. Terima kasih!");
    deleteAfterDelay(chatId, notif.message_id);
  } catch (error) {
    console.error("Error waiting for photo:", error);
    const errorMsg = await bot.sendMessage(chatId, "⚠️ Waktu pengiriman bukti transfer telah habis. Silakan ulangi proses pembayaran.");
    deleteAfterDelay(chatId, errorMsg.message_id);
  } finally {
    if (tempMessagesToDelete[chatId]) {
      await bot.deleteMessage(chatId, tempMessagesToDelete[chatId]).catch(() => {});
      delete tempMessagesToDelete[chatId];
    }
  }
}

async function handleOwnerConfirmation(paymentId, ownerChatId, isApproved) {
  try {
    const payment = userPendingPayments[paymentId];
    if (!payment) {
      const notif = await bot.sendMessage(ownerChatId, "⚠️ Pembayaran tidak ditemukan.");
      deleteAfterDelay(ownerChatId, notif.message_id);
      return;
    }
    
    const { userId, username, product, method, fileId, chatId } = payment;
    
    if (isApproved) {
      const productLink = product.productLink || `https://example.com/download?product=${encodeURIComponent(product.name)}&user=${userId}`;
      
      const productMessage = `🎉 *Pembayaran Dikonfirmasi!* 🎉\n\n` +
        `📦 *Produk:* ${product.name}\n` +
        `💰 *Harga:* Rp${product.price}\n` +
        `🔗 *Link Download:* [Klik Disini](${productLink})\n\n` +
        `📝 *Petunjuk:*\n` +
        `1. Klik link di atas untuk mengunduh produk\n` +
        `2. Jika ada masalah, hubungi owner\n` +
        `3. Jangan lupa simpan link ini untuk akses di masa depan\n\n` +
        `🙏 Terima kasih telah berbelanja!`;
      
      await bot.sendMessage(chatId, productMessage, {
        parse_mode: "Markdown",
        disable_web_page_preview: true
      });
      
      const ownerMessage = `✅ *Pembayaran Diterima*\n\n` +
        `🆔 *ID Pembayaran:* ${paymentId}\n` +
        `👤 *Customer:* @${username} (ID: ${userId})\n` +
        `📦 *Produk:* ${product.name}\n` +
        `💵 *Harga:* Rp${product.price}\n` +
        `💳 *Metode:* ${method}\n\n` +
        `🔗 *Link Produk:* ${productLink}`;
      
      const notif = await bot.sendMessage(ownerChatId, ownerMessage, {
        parse_mode: "Markdown"
      });
      deleteAfterDelay(ownerChatId, notif.message_id);
      
      saveTransactionHistory(paymentId, userId, username, product, method, productLink);
      
    } else {
      const rejectionMessage = `⚠️ *Pembayaran Ditolak*\n\n` +
        `Maaf, bukti transfer Anda untuk produk *${product.name}* tidak valid.\n\n` +
        `Silakan:\n` +
        `1. Periksa kembali bukti transfer\n` +
        `2. Pastikan nominal sesuai (Rp${product.price})\n` +
        `3. Kirim ulang bukti yang valid\n\n` +
        `Jika sudah melakukan transfer, mohon hubungi owner @${ownerUsername}`;
      
      await bot.sendMessage(chatId, rejectionMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📩 Hubungi Owner", url: `https://t.me/${ownerUsername}` }]
          ]
        }
      });
      
      const notif = await bot.sendMessage(ownerChatId, `❌ Pembayaran ${paymentId} dari @${username} telah ditolak.`);
      deleteAfterDelay(ownerChatId, notif.message_id);
    }
    
    delete userPendingPayments[paymentId];
  } catch (err) {
    console.error("Error handling owner confirmation:", err);
    const notif = await bot.sendMessage(ownerChatId, "⚠️ Gagal memproses konfirmasi pembayaran.");
    deleteAfterDelay(ownerChatId, notif.message_id);
  }
}

async function viewPendingPayments(chatId) {
  try {
    if (Object.keys(userPendingPayments).length === 0) {
      const notif = await bot.sendMessage(chatId, "Tidak ada pembayaran tertunda.");
      deleteAfterDelay(chatId, notif.message_id);
      return;
    }

    let message = "📋 *Daftar Pembayaran Tertunda:*\n\n";
    Object.entries(userPendingPayments).forEach(([paymentId, payment]) => {
      message += `🆔 *ID:* ${paymentId}\n` +
                 `👤 *User:* @${payment.username} (${payment.userId})\n` +
                 `📦 *Produk:* ${payment.product.name}\n` +
                 `💵 *Harga:* Rp${payment.product.price}\n` +
                 `💳 *Metode:* ${payment.method}\n\n`;
    });

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown"
    });
  } catch (err) {
    console.error("Error viewing pending payments:", err);
    const notif = await bot.sendMessage(chatId, "⚠️ Gagal memuat daftar pembayaran tertunda.");
    deleteAfterDelay(chatId, notif.message_id);
  }
}

// Export fungsi untuk Vercel
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const update = req.body;
      await bot.processUpdate(update);
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(200).json({ status: 'Bot is running' });
    }
  } catch (error) {
    console.error('Error processing update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
