const icons = require('./node_modules/@iconify-json/simple-icons/icons.json');
const keys = Object.keys(icons);
const matches = keys.filter(k => /weibo|sina|write|copy|brand|story|ad|fiction|novel|script|film|movie|doc|tech|tutorial|guide|email|mail|seo|google|notebook|book|lucide|article/i.test(k));
console.log(matches.join('\n'));
