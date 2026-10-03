/*
 * FreeBox18PlusIA.js
 * 合法成人向电影测试 Spider：恐怖 / 犯罪 / 惊悚 / 黑色电影
 * 数据来源：Internet Archive 元数据 API。
 *
 * 说明：
 * FreeBox 的 JS Spider 接口属于 TVBox/CatVod 生态，具体 JS 网络请求桥
 * 会随版本变化。本脚本按常见 CatVod JS Spider 方法组织，适合在 FreeBox
 * 的 Spider 动态调试功能中测试；若你的 v1.3.0 对 JS HTTP 桥名称不同，
 * 可直接据报错调整 request()。
 */

var BASE = "https://archive.org";
var SEARCH = BASE + "/advancedsearch.php";
var META = BASE + "/metadata/";

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function enc(s) { return encodeURIComponent(String(s == null ? "" : s)); }

function request(url) {
    // CatVod/FreeBox 常见 JS Spider 环境优先使用 fetch。
    if (typeof fetch === "function") {
        return fetch(url).then(function(r) { return r.text(); });
    }
    throw new Error("当前 FreeBox JS 环境没有 fetch，请在 Spider 动态调试中确认 JS 网络接口");
}

function json(s) { return JSON.parse(s); }

function homeContent(filter) {
    return JSON.stringify({
        class: [
            {type_id:"horror", type_name:"恐怖"},
            {type_id:"crime", type_name:"犯罪"},
            {type_id:"thriller", type_name:"惊悚"},
            {type_id:"film_noir", type_name:"黑色电影"}
        ]
    });
}

function categoryQuery(tid) {
    var q = "mediatype:movies AND ";
    if (tid === "horror") return q + "subject:(horror)";
    if (tid === "crime") return q + "subject:(crime)";
    if (tid === "thriller") return q + "subject:(thriller)";
    return q + "subject:(film noir OR noir)";
}

async function searchIA(q, page) {
    var rows = 20;
    var start = Math.max(1, Number(page || 1));
    var url = SEARCH + "?q=" + enc(q)
        + "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=description"
        + "&fl%5B%5D=date&rows=" + rows + "&page=" + start
        + "&output=json";
    return json(await request(url));
}

function docsToList(docs) {
    var list = [];
    (docs || []).forEach(function(d) {
        if (!d.identifier) return;
        list.push({
            vod_id: d.identifier,
            vod_name: d.title || d.identifier,
            vod_pic: BASE + "/services/img/" + enc(d.identifier),
            vod_remarks: d.date || "Internet Archive",
            vod_content: d.description || "Internet Archive 公共领域/授权资料。"
        });
    });
    return list;
}

async function categoryContent(tid, pg, filter, extend) {
    var data = await searchIA(categoryQuery(tid), pg);
    return JSON.stringify({
        page: Number(pg || 1),
        pagecount: Math.ceil((data.response && data.response.numFound || 0) / 20),
        limit: 20,
        total: data.response && data.response.numFound || 0,
        list: docsToList(data.response && data.response.docs)
    });
}

async function searchContent(key, quick, pg) {
    var q = "mediatype:movies AND (" + key + ")";
    var data = await searchIA(q, pg);
    return JSON.stringify({
        page: Number(pg || 1),
        pagecount: Math.ceil((data.response && data.response.numFound || 0) / 20),
        limit: 20,
        total: data.response && data.response.numFound || 0,
        list: docsToList(data.response && data.response.docs)
    });
}

function chooseVideoFile(files) {
    var candidates = [];
    (files || []).forEach(function(f) {
        if (!f || !f.name || f.private) return;
        var name = String(f.name).toLowerCase();
        var format = String(f.format || "").toLowerCase();
        if (/\.(mp4|m4v|webm|mkv|mov|avi)$/.test(name) ||
            /mpeg-4|webm|matroska|quicktime/.test(format)) {
            candidates.push(f);
        }
    });
    candidates.sort(function(a,b) {
        var sa = Number(a.size || 0), sb = Number(b.size || 0);
        return sb - sa;
    });
    return candidates[0] || null;
}

async function detailContent(ids) {
    var id = String(ids || "").split("&&")[0];
    var data = json(await request(META + enc(id)));
    var m = data.metadata || {};
    var file = chooseVideoFile(data.files);
    var playUrl = "";
    if (file && data.d1 && data.dir) {
        playUrl = "https://" + data.d1 + data.dir + "/" + encodeURIComponent(file.name);
    }
    var vod = {
        vod_id: id,
        vod_name: m.title || id,
        vod_pic: BASE + "/services/img/" + enc(id),
        vod_year: String(m.year || m.date || ""),
        vod_area: "Internet Archive",
        vod_content: m.description || "合法成人向电影测试资料。",
        vod_play_from: file ? "Internet Archive" : "",
        vod_play_url: file ? "在线播放$" + playUrl : ""
    };
    return JSON.stringify({list:[vod]});
}

async function playerContent(flag, id, vipFlags) {
    return JSON.stringify({
        parse: 0,
        playUrl: "",
        url: id,
        header: {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://archive.org/"
        }
    });
}

function init(ext) {}

function destroy() {}

this.init = init;
this.homeContent = homeContent;
this.categoryContent = categoryContent;
this.searchContent = searchContent;
this.detailContent = detailContent;
this.playerContent = playerContent;
this.destroy = destroy;
