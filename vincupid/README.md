# VinCupid — dating app prototype for VinUni

A single-file, click-through prototype (`index.html`, no build step). Open it in a browser, or serve the folder:

```
cd vincupid && python3 -m http.server 8080   # then open http://localhost:8080
```

- **Demo accounts:** Nguyen Hoang Minh Tri (student) and Tran Thi Thanh Ngan (faculty TA). You can also sign up with any `@vinuni.edu.vn` email; the OTP is `123456`.
- **Separate pools:** students only see students, and faculty only see faculty.
- **AI:** paste a Gemini API key in **Settings**. Without a key, VinCupid falls back to built-in safety rules.
- **Data:** everything (profiles, matches, chats, reviews, the key) is stored in this browser's localStorage.

## Photos
Drop up to 5 photos per user at `photos/<user-id>/1.jpg` … `5.jpg`. Any missing file shows a gradient placeholder.
User IDs: `minh-tri`, `bao-anh`, `gia-huy`, `khanh-linh`, `thanh-ngan`, `duc-minh`, `phuong-thao`, `quoc-bao`.
