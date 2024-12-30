const express = require('express');
const cors = require('cors');
const { default: mongoose, connect } = require('mongoose');
const User = require('./models/user');
const Post = require('./models/post');
const bcrypt = require('bcrypt'); //used to ecrypt data
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const { json } = require('stream/consumers');

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

const secret = "ncknknaidnckianckanc";
const salt = bcrypt.genSaltSync(10);
mongoose.connect('mongodb+srv://usmanali0044444:usmanali0044444@cluster0.gwosf.mongodb.net/');

app.get('/test', async (req, res) => {
        res.status(200).json('Test is running hey from backend server');
});

app.post('/register', async (req, res) => {
        const { username, password } = req.body;
        try {
                const userDoc = await User.create({
                        username,
                        password: bcrypt.hashSync(password, salt),
                });
                res.json(userDoc);
        }
        catch (e) {
                res.status(400).json(e);
        }
});

app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        const userDoc = await User.findOne({ username });
        const passOk = bcrypt.compareSync(password, userDoc.password);

        if (passOk) {
                jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
                        if (err) throw err;
                        res.cookie('token', token).json({
                                id: userDoc._id,
                                username,
                        });
                });
        } else {
                res.status(400).json('Wrong credentials');
        }
});

app.get('/profile', (req, res) => {
        console.log("📡 Received GET request to /profile");

        const { token } = req.cookies;
        if (!token) {
                console.warn("⚠️ No token found in cookies!");
                return res.status(401).json({ error: "Authentication token is missing" });
        }
        console.log("🔑 Token found in cookies:", token);

        jwt.verify(token, secret, {}, (err, info) => {
                if (err) {
                        console.error("❌ JWT verification failed:", err.message);
                        return res.status(403).json({ error: "Invalid or expired token" });
                }
                console.log("✅ JWT verified successfully. User info:", info);
                res.json(info);
        });
});


// to logout the user 
app.post('/logout', (req, res) => {
        res.cookie('token', '').json('ok')
})

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
        try {
                if (!req.file) {
                        return res.status(400).json({ error: "File upload is required!" });
                }
                const { originalname, path } = req.file;

                const parts = originalname.split('.');
                const ext = parts[parts.length - 1];
                const newPath = path + '.' + ext;
                fs.renameSync(path, newPath);

                const { title, summary, content } = req.body;
                if (!title || !summary || !content) {
                        return res.status(400).json({ error: "Title, summary, and content are required!" });
                }

                const { token } = req.cookies;
                jwt.verify(token, secret, {}, async (err, info) => {
                        if (err) throw err;
                        const postDoc = await Post.create({
                                title,
                                summary,
                                content,
                                cover: newPath,
                                author: info.id,
                        });
                        res.json(postDoc);
                });
        } catch (error) {
                res.status(500).json({ error: "Internal server error" });
        }
});

app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
        try {
            const postId = req.params.id;
    
            if (!postId) {
                console.error("❌ Post ID is missing");
                return res.status(400).json({ error: "Post ID is required!" });
            }
    
            console.log(`📌 Post ID: ${postId}`);
    
            const { title, summary, content } = req.body;
    
            if (!title || !summary || !content) {
                console.error("❌ Missing title, summary, or content");
                return res.status(400).json({ error: "Title, summary, and content are required for updating!" });
            }
    
            console.log(`📋 Received Data: title=${title}, summary=${summary}, content=${content}`);
    
            let newPath = null;
    
            // Handle file upload if provided
            if (req.file) {
                console.log("📂 File upload detected");
                const { originalname, path } = req.file;
                const parts = originalname.split('.');
                const ext = parts[parts.length - 1];
                newPath = path + '.' + ext;
                console.log(`🖼️ File being renamed: ${path} ➡️ ${newPath}`);
                fs.renameSync(path, newPath);
            } else {
                console.log("📂 No file uploaded");
            }
    
            const { token } = req.cookies;
    
            if (!token) {
                console.error("❌ Missing token in cookies");
                return res.status(401).json({ error: "Unauthorized: Token is required!" });
            }
    
            console.log("🔑 Token found, verifying...");
    
            jwt.verify(token, secret, {}, async (err, info) => {
                if (err) {
                    console.error("❌ Token verification failed:", err.message);
                    return res.status(401).json({ error: "Unauthorized access!" });
                }
    
                console.log(`✅ Token verified: User ID=${info.id}`);
    
                const post = await Post.findById(postId);
    
                if (!post) {
                    console.error("❌ Post not found");
                    return res.status(404).json({ error: "Post not found!" });
                }
    
                console.log("📃 Post found, verifying author...");
                
                if (post.author.toString() !== info.id) {
                    console.error("❌ Unauthorized: User is not the author of this post");
                    return res.status(403).json({ error: "You are not authorized to update this post!" });
                }
    
                console.log("✅ User authorized, updating post...");
    
                // Update post fields
                post.title = title;
                post.summary = summary;
                post.content = content;
    
                if (newPath) {
                    post.cover = newPath;
                    console.log("🖼️ Cover image updated");
                }
    
                const updatedPost = await post.save();
    
                console.log("🎉 Post updated successfully:", updatedPost);
    
                res.json({ message: "Post updated successfully!", post: updatedPost });
            });
        } catch (error) {
            console.error("💥 Internal server error:", error.message);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    
    

app.get('/post', async (req, res) => {
        res.json(
                await Post.find()
                        .populate('author', ['username'])
                        .sort({ createdAt: -1 })
                        .limit(20)
        );
});

app.get('/post/:id', async (req, res) => {
        const { id } = req.params;
        const postDoc = await Post.findById(id).populate('author', ['username']);
        console.log("Post  ⌛⌛⌛⌛" , postDoc);
        res.json(postDoc);
});

app.listen(4000, () => console.log("Server is running on port 4000"));

