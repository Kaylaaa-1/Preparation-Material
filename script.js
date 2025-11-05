
// ====== FUNGSI HASH PASSWORD ======
async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ====== LOGIN DAN REGISTER ======
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const userLabel = document.getElementById('userRoleLabel');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

let userDB = JSON.parse(localStorage.getItem('userDB') || '[]');
let currentUser = localStorage.getItem('userRole');

function showApp(role) {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    userLabel.textContent = 'Login sebagai: ' + (role === 'master' ? 'Master Admin' : 'Member');
    localStorage.setItem('userRole', role);
    limitAccess(role);
}

function limitAccess(role) {
    if (role === 'member') {
        document.getElementById('btnAddProduct').style.display = 'none';
        document.getElementById('btnLoadSample').style.display = 'none';
        document.getElementById('btnExportProducts').style.display = 'none';
        document.getElementById('btnClearProducts').style.display = 'none';
    }
}

if (currentUser) showApp(currentUser);

// LOGIN
btnLogin.onclick = async () => {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const hashed = await hashPassword(pass);

    if (user === 'admin' && pass === '1234') {
        showApp('master');
        return;
    }

    const found = userDB.find(u => u.username === user && u.password === hashed);
    if (found) {
        showApp('member');
    } else {
        alert('Username atau password salah!');
    }
};

// REGISTER
document.getElementById('btnRegister').onclick = async () => {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();

    if (!user || !pass) {
        alert('Isi semua kolom!');
        return;
    }
    if (userDB.find(u => u.username === user)) {
        alert('Username sudah terdaftar!');
        return;
    }

    const hashed = await hashPassword(pass);
    userDB.push({ username: user, password: hashed });
    localStorage.setItem('userDB', JSON.stringify(userDB));
    alert('Akun member berhasil dibuat! Silakan login.');
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
};

// Form switching
showRegister.onclick = () => {
    const access = prompt("Masukkan password akses untuk membuka pendaftaran:");
    if (access === "akses123") { // ubah sesuai password rahasia kamu
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    } else if (access === null) {
        // pengguna menekan Cancel → tidak lakukan apa-apa
        return;
    } else {
        alert("Password akses salah! Anda tidak dapat membuka halaman pendaftaran.");
    }
};

showLogin.onclick = () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
};

btnLogout.onclick = () => {
    localStorage.removeItem('userRole');
    location.reload();
};

const money = v => 'Rp ' + Number(v).toLocaleString('id-ID');
const storageKey = 'web-stock-products-upload';
let products = JSON.parse(localStorage.getItem(storageKey) || '[]');
const tbody = document.querySelector('#productTable tbody');
const imageViewer = document.getElementById('imageViewer');

function saveProducts() {
    localStorage.setItem(storageKey, JSON.stringify(products));
}

function renderProducts(filter = '') {
    tbody.innerHTML = '';
    const f = filter.trim().toLowerCase();
    products.forEach(p => {
        const inFilter = !f ||
            p.name.toLowerCase().includes(f) ||
            (p.sku || '').toLowerCase().includes(f) ||
            (p.features || '').toLowerCase().includes(f);

        if (!inFilter) return;

        const tr = document.createElement('tr');
        // Pisahkan hanya kata pertama dari ciri-ciri
        const firstWord = (p.features || '').split(/\s+/)[0] || '-';

        tr.innerHTML = `
  <td class='sku' style='color:var(--accent);cursor:pointer;'>${p.sku || ''}</td>
  <td class='name' style='color:var(--accent);cursor:pointer;'>${p.name}</td>
  <td class='features' data-firstword="${firstWord}" data-fulltext="${p.features || '-'}">
    <span>${p.features || '-'}</span>
  </td>
  <td>${money(p.price)}</td>
  <td>${p.stock || 0}</td>
  <td style='text-align:right'></td>
`;

        // ✅ Tambahkan event klik untuk menampilkan teks lengkap di bawah tabel
        tr.querySelector('.features').onclick = () => {
            const previewBox = document.getElementById('featuresPreview');
            previewBox.innerHTML = `<b>Ciri-ciri lengkap:</b> ${p.features || '-'}`;
            previewBox.style.padding = '6px 10px';
            previewBox.style.background = '#f8fafc';
            previewBox.style.borderRadius = '8px';
            previewBox.style.border = '1px solid #e2e8f0';
        };

        const td = tr.querySelector('td:last-child');
        const role = localStorage.getItem('userRole'); // ambil role user sekarang

        // hanya Master yang bisa edit
        if (role === 'master') {
            const edit = document.createElement('button');
            edit.className = 'btn ghost';
            edit.textContent = 'Edit';
            edit.onclick = () => openModal('edit', p.id);
            td.appendChild(edit);
        }

        // ✅ Tambahkan event klik agar gambar muncul saat klik SKU/Nama
        tr.querySelector('.sku').style.cursor = 'pointer';
        tr.querySelector('.name').style.cursor = 'pointer';
        tr.querySelector('.sku').onclick = () => showImage(p.img);
        tr.querySelector('.name').onclick = () => showImage(p.img);

        tbody.appendChild(tr);

    });
}

function showImage(src) {
    if (!src) {
        imageViewer.innerHTML = '<span class="muted">Produk ini tidak memiliki gambar.</span>';
        return;
    }
    imageViewer.innerHTML = `<img src="${src}" alt="Produk" />`;
}

// Modal
const modal = document.getElementById('modal');
let mode = 'add';
let editId = null;

document.getElementById('btnAddProduct').onclick = () => openModal('add');
document.getElementById('btnCancel').onclick = () => (modal.style.display = 'none');

function openModal(m, id = null) {
    mode = m;
    editId = id;
    modal.style.display = 'flex';
    document.getElementById('pmSku').value = '';
    document.getElementById('pmName').value = '';
    document.getElementById('pmFeatures').value = '';
    document.getElementById('pmPrice').value = '';
    document.getElementById('pmStock').value = '';
    document.getElementById('pmImgFile').value = '';
    document.getElementById('modalTitle').textContent =
        m === 'add' ? 'Tambah Produk' : 'Edit Produk';

    if (m === 'edit') {
        const p = products.find(x => x.id === id);
        if (p) {
            document.getElementById('pmSku').value = p.sku || '';
            document.getElementById('pmName').value = p.name;
            document.getElementById('pmFeatures').value = p.features || '';
            document.getElementById('pmPrice').value = p.price;
            document.getElementById('pmStock').value = p.stock || 0;
        }
    }
}

document.getElementById('btnSaveProduct').onclick = () => {
    const sku = document.getElementById('pmSku').value.trim();
    const name = document.getElementById('pmName').value.trim();
    const features = document.getElementById('pmFeatures').value.trim();
    const price = Number(document.getElementById('pmPrice').value) || 0;
    const stock = Number(document.getElementById('pmStock').value) || 0;
    const file = document.getElementById('pmImgFile').files[0];
    if (!name) return alert('Nama wajib diisi');

    const reader = new FileReader();
    reader.onload = function (e) {
        const imgData = e.target.result;
        if (mode === 'add') {
            products.push({
                id: 'p' + Date.now(),
                sku,
                name,
                features,
                price,
                stock,
                img: imgData
            });
        } else if (mode === 'edit') {
            products = products.map(p =>
                p.id === editId
                    ? { ...p, sku, name, features, price, stock, img: imgData }
                    : p
            );
        }
        saveProducts();
        renderProducts(document.getElementById('search').value);
        modal.style.display = 'none';
    };

    if (file) {
        reader.readAsDataURL(file);
    } else {
        if (mode === 'add') {
            products.push({
                id: 'p' + Date.now(),
                sku,
                name,
                features,
                price,
                stock,
                img: ''
            });
        } else if (mode === 'edit') {
            products = products.map(p =>
                p.id === editId ? { ...p, sku, name, features, price, stock } : p
            );
        }
        saveProducts();
        renderProducts(document.getElementById('search').value);
        modal.style.display = 'none';
    }
};

document.getElementById('btnLoadSample').onclick = () => {
    products = [
        {
            id: 'p1',
            sku: 'SKU001',
            name: 'Botol Air',
            features: 'bening, bulat, plastik',
            price: 12000,
            stock: 30,
            img: ''
        },
        {
            id: 'p2',
            sku: 'SKU002',
            name: 'Roti Tawar',
            features: 'putih, lembut, persegi',
            price: 8000,
            stock: 20,
            img: ''
        },
        {
            id: 'p3',
            sku: 'SKU003',
            name: 'Sabun Mandi',
            features: 'biru, harum, kotak',
            price: 15000,
            stock: 50,
            img: ''
        }
    ];
    saveProducts();
    renderProducts();
};

document.getElementById('search').oninput = e => renderProducts(e.target.value);

document.getElementById('btnClearProducts').onclick = () => {
    if (confirm('Hapus semua produk?')) {
        products = [];
        saveProducts();
        renderProducts();
    }
};

document.getElementById('btnExportProducts').onclick = () => {
    if (products.length === 0) return alert('Tidak ada produk');
    const csv = [
        'sku,name,features,price,stock',
        ...products.map(
            p =>
                `${p.sku || ''},"${p.name.replace(/\"/g, '\"\"')}","${(p.features || '').replace(/\"/g, '\"\"')}",${p.price},${p.stock || 0}`
        )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'produk.csv';
    a.click();
    URL.revokeObjectURL(url);
};

renderProducts();
