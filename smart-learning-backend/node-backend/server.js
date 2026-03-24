const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const serviceAccount = require("./firebaseServiceAccountKey.json");

const app = express();
// const corsOptions = {
//   origin: "https://smart-learning-frontend-jjp8.onrender.com",
//   methods: ["GET","POST","PUT","DELETE","OPTIONS"],
//   allowedHeaders: ["Content-Type","Authorization"],
//   credentials: true
// };

// app.use(cors(corsOptions));
// app.options(/.*/, cors(corsOptions));

const corsOptions = {
  origin: 'https://the-smart-learning-platform.vercel.app',  // Fixed URL + quotes
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Array + quotes
  allowedHeaders: ['Content-Type', 'Authorization'],  // Array + quotes
  credentials: true
};

app.use(cors(corsOptions));  // Add ()
app.options(/.*/, cors(corsOptions));  // Fix to '*'

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.set('trust proxy', 1);  // Render HTTPS fix

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const PYTHON_API = process.env.PYTHON_API_URL || "https://smart-learning-python-services.onrender.com";

// -----------------------------
// AUTH ENDPOINT
// -----------------------------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, role, rollNo } = req.body;

    let actualRollNo;
    let childUid;

    if (role === "student") {
      actualRollNo = rollNo;
      if (!actualRollNo) throw new Error("Roll number is required for students");

      const q = db.collection("users")
        .where("role", "==", "student")
        .where("rollNo", "==", actualRollNo);
      const snapshot = await q.get();
      if (!snapshot.empty) throw new Error("Roll number already exists");
    } else if (role === "parent") {
      if (!rollNo) throw new Error("Child's roll number is required for parent signup");

      const childQuery = db.collection("users")
        .where("role", "==", "student")
        .where("rollNo", "==", rollNo);
      const childSnapshot = await childQuery.get();

      if (childSnapshot.empty) throw new Error(`Student with roll number ${rollNo} not found`);
      childUid = childSnapshot.docs[0].id;
    }

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    const newUserData = {
      uid: userRecord.uid,
      name,
      email,
      role,
      ...(actualRollNo && { rollNo: actualRollNo }),
      ...(childUid && { childUid }),
      ...(role === "parent" && rollNo && { childRollNo: rollNo }),
      firstLogin: role === "student",
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(userRecord.uid).set(newUserData);
    res.json({ message: "Account created successfully! Please sign in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// PYTHON API PROXY ENDPOINTS
// -----------------------------

// ----------------------------- READING PRACTICE -----------------------------
app.get("/api/reading/passage", async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API}/reading/passage`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch passage" });
  }
});

app.post("/api/reading/analyze", async (req, res) => {
  try {
    const { userId, audioBase64, passageText } = req.body;
    const response = await axios.post(`${PYTHON_API}/reading/analyze`, {
      audioBase64: audioBase64,
      passageText: passageText,
    });

    await db.collection("readingProgress").add({
      userId,
      sentiment: response.data.sentiment,
      score: response.data.score,
      transcribed: response.data.transcribed,
      timestamp: new Date(),
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error analyzing reading" });
  }
});

// ✅ ADDED: GET reading progress for a user
app.get("/api/reading/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection("readingProgress")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const progressData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
    }));

    res.json(progressData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reading progress" });
  }
});

// ----------------------------- WRITING PRACTICE ENDPOINTS -----------------------------
app.post("/api/writing/submit", async (req, res) => {
  try {
    const { userId, score, letter } = req.body;
    await db.collection("writingProgress").add({
      userId,
      score,
      letter,
      timestamp: new Date(),
    });
    res.json({ message: "Score saved successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/writing/verify", async (req, res) => {
  try {
    const { image: imageBase64 } = req.body;
    const response = await axios.post(`${PYTHON_API}/writing/predict`, {
      image: imageBase64,
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Python handwriting model failed" });
  }
});

// ----------------------------- SPELL BEE MODULE -----------------------------
app.get("/api/words", async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API}/spellbee/words`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch words" });
  }
});

app.post("/api/spellbee/evaluate", async (req, res) => {
  try {
    const { userId, audioBase64, targetWord } = req.body;
    const response = await axios.post(`${PYTHON_API}/spellbee/evaluate`, {
      audioBase64: audioBase64,
      targetWord: targetWord,
    });

    const { accuracy, isCorrect } = response.data;
    await db.collection("spellBeeScores").add({
      userId,
      accuracy,
      isCorrect,
      timestamp: new Date(),
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error evaluating spelling" });
  }
});

// ----------------------------- WORD BUILDING GAME -----------------------------
app.post("/api/wordgame/botmove", async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_API}/wordbot/botmove`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Bot failed to make a move" });
  }
});

app.post("/api/wordgame/save", async (req, res) => {
  try {
    const { userId, score } = req.body;
    await db.collection("wordGameScores").add({
      userId,
      score,
      timestamp: new Date(),
    });
    res.json({ message: "Saved!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------- LEADERBOARD ENDPOINTS -----------------------------
app.post("/api/leaderboard", async (req, res) => {
  try {
    const { userId, name, score } = req.body;
    const existingQuery = await db.collection("leaderboard")
      .where("userId", "==", userId)
      .get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      const existingScore = existingDoc.data().score || 0;
      const newTotalScore = existingScore + score;

      await existingDoc.ref.update({
        score: newTotalScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ message: "Score added to leaderboard!", totalScore: newTotalScore });
    } else {
      await db.collection("leaderboard").add({
        userId,
        name,
        score: score,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ message: "Added to leaderboard!", totalScore: score });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const leaderboardSnapshot = await db.collection("leaderboard")
      .orderBy("score", "desc")
      .limit(100)
      .get();
    const leaderboardData = leaderboardSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(leaderboardData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------- PROGRESS ENDPOINTS -----------------------------
app.post("/api/reading/submit", async (req, res) => {
  try {
    const { userId, score, story } = req.body;
    await db.collection("readingProgress").add({
      userId,
      score,
      story,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Reading progress saved successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/spellbee/submit", async (req, res) => {
  try {
    const { userId, accuracy, wordsAttempted } = req.body;
    await db.collection("spellBeeScores").add({
      userId,
      accuracy,
      wordsAttempted,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Spell Bee score saved successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/wordgame/submit", async (req, res) => {
  try {
    const { userId, score, level } = req.body;
    await db.collection("wordGameScores").add({
      userId,
      score,
      level,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Word game score saved successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------- EMOTIONAL/MENTAL HEALTH ENDPOINTS -----------------------------
app.post("/api/emotional/save", async (req, res) => {
  try {
    const { userId, mood, notes, activities } = req.body;
    await db.collection("emotionalFeedback").add({
      userId,
      mood,
      notes: notes || "",
      activities: activities || [],
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Emotional feedback saved successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/emotional/child/:childId", async (req, res) => {
  try {
    const { childId } = req.params;
    const emotionalSnapshot = await db
      .collection("emotionalFeedback")
      .where("userId", "==", childId)
      .limit(100)
      .get();

    const feedbackData = emotionalSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const moodCounts = {};
    feedbackData.forEach((entry) => {
      const mood = entry.mood || "neutral";
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const recentMoods = feedbackData.slice(0, 7);
    const happyMoods = ["happy", "excited", "proud", "grateful"].reduce(
      (sum, mood) => sum + (moodCounts[mood] || 0),
      0
    );

    const totalMoods = feedbackData.length || 1;
    const mentalHealthScore = Math.round((happyMoods / totalMoods) * 100);

    res.json({
      totalEntries: feedbackData.length,
      moodDistribution: moodCounts,
      recentMoods: recentMoods,
      mentalHealthScore: mentalHealthScore,
      allFeedback: feedbackData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/progress/child/:childId", async (req, res) => {
  try {
    const { childId } = req.params;
    const childDoc = await db.collection("users").doc(childId).get();

    if (!childDoc.exists) return res.status(404).json({ error: "Child not found" });

    const childData = childDoc.data();

    const [writing, reading, spellBee, wordGame, emotional] = await Promise.all([
      db.collection("writingProgress").where("userId", "==", childId).get(),
      db.collection("readingProgress").where("userId", "==", childId).get(),
      db.collection("spellBeeScores").where("userId", "==", childId).get(),
      db.collection("wordGameScores").where("userId", "==", childId).get(),
      db.collection("emotionalFeedback").where("userId", "==", childId).get(),
    ]);

    const writingData = writing.docs.map((d) => d.data());
    const readingData = reading.docs.map((d) => d.data());
    const spellBeeData = spellBee.docs.map((d) => d.data());
    const wordGameData = wordGame.docs.map((d) => d.data());
    const emotionalData = emotional.docs.map((d) => d.data());

    const sortByTime = (arr) =>
      arr.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));

    sortByTime(writingData);
    sortByTime(readingData);
    sortByTime(spellBeeData);
    sortByTime(wordGameData);
    sortByTime(emotionalData);

    const scores = (arr, field) => arr.map((i) => i[field] || 0);
    const writingScores = scores(writingData, "score");
    const readingScores = scores(readingData, "score");
    const spellScores = scores(spellBeeData, "accuracy");
    const wordScores = scores(wordGameData, "score");

    const average = (arr) =>
      arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const overallAverageValues = [
      average(writingScores),
      average(readingScores),
      average(spellScores),
      average(wordScores),
    ].filter((v) => v > 0);

    const overallAverage =
      overallAverageValues.length > 0
        ? Math.round(overallAverageValues.reduce((a, b) => a + b, 0) / overallAverageValues.length)
        : 0;

    const moodCounts = {};
    emotionalData.forEach((entry) => {
      const mood = entry.mood || "neutral";
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const happyMoods = ["amazing", "happy", "excited"].reduce(
      (sum, mood) => sum + (moodCounts[mood] || 0),
      0
    );

    const mentalHealthScore =
      emotionalData.length > 0 ? Math.round((happyMoods / emotionalData.length) * 100) : 0;

    const totalActivities =
      writingData.length + readingData.length + spellBeeData.length + wordGameData.length;

    const recentActivity = [
      ...writingData.map((d) => ({ type: "Writing", ...d })),
      ...readingData.map((d) => ({ type: "Reading", ...d })),
      ...spellBeeData.map((d) => ({ type: "Spell Bee", ...d })),
      ...wordGameData.map((d) => ({ type: "Word Game", ...d })),
    ]
      .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
      .slice(0, 10);

    const response = {
      childInfo: {
        name: childData.name,
        rollNo: childData.rollNo,
        email: childData.email || "",
        mentalAge: childData.mentalAge || null,
      },
      overallStats: {
        totalActivities: totalActivities,
        averageScore: overallAverage.toString(),
        mentalHealthScore: mentalHealthScore + "",
      },
      activityBreakdown: {
        writing: {
          average: average(writingScores).toString(),
          total: writingData.length,
          recent: writingScores.slice(0, 5),
        },
        reading: {
          average: average(readingScores).toString(),
          total: readingData.length,
          recent: readingScores.slice(0, 5),
        },
        spellBee: {
          average: average(spellScores).toString(),
          total: spellBeeData.length,
          recent: spellScores.slice(0, 5),
        },
        wordGame: {
          average: average(wordScores).toString(),
          total: wordGameData.length,
          recent: wordScores.slice(0, 5),
        },
      },
      recentActivity,
      emotionalFeedback: emotionalData,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// ----------------------------- AGGREGATE STUDENT PROGRESS FOR TEACHER DASHBOARD -----------------------------
app.get("/api/teacher/students", async (req, res) => {
  try {
    const studentsSnapshot = await db.collection("users").where("role", "==", "student").get();

    if (studentsSnapshot.empty) return res.json([]);

    const results = await Promise.allSettled(
      studentsSnapshot.docs.map(async (student) => {
        const studentData = student.data();
        const userId = student.id;

        try {
          const [writing, reading, spellBee, wordGame, emotional] = await Promise.all([
            db.collection("writingProgress").where("userId", "==", userId).get(),
            db.collection("readingProgress").where("userId", "==", userId).get(),
            db.collection("spellBeeScores").where("userId", "==", userId).get(),
            db.collection("wordGameScores").where("userId", "==", userId).get(),
            db.collection("emotionalFeedback").where("userId", "==", userId).get(),
          ]);

          const toArray = (docs) => docs.docs.map((d) => d.data());
          const sort = (arr) =>
            arr.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));

          const writingData = sort(toArray(writing));
          const readingData = sort(toArray(reading));
          const spellBeeData = sort(toArray(spellBee));
          const wordGameData = sort(toArray(wordGame));
          const emotionalData = sort(toArray(emotional));

          const avg = (arr, field) =>
            arr.length ? Math.round(arr.reduce((a, b) => a + (b[field] || 0), 0) / arr.length) : 0;

          const writingAvg = avg(writingData, "score");
          const readingAvg = avg(readingData, "score");
          const spellBeeAvg = avg(spellBeeData, "accuracy");
          const wordGameAvg = avg(wordGameData, "score");

          const overall = [writingAvg, readingAvg, spellBeeAvg, wordGameAvg].filter((v) => v > 0);
          const overallProgress = overall.length
            ? Math.round(overall.reduce((a, b) => a + b, 0) / overall.length)
            : 0;

          const moodCounts = {};
          emotionalData.forEach((e) => {
            moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
          });

          const happyMoods = ["amazing", "happy", "excited"].reduce(
            (sum, m) => sum + (moodCounts[m] || 0),
            0
          );

          const mentalHealthScore =
            emotionalData.length > 0 ? Math.round((happyMoods / emotionalData.length) * 100) : 0;

          return {
            id: userId,
            name: studentData.name,
            email: studentData.email || "",
            rollNo: studentData.rollNo,
            mentalAge: studentData.mentalAge || null,
            overallProgress,
            mentalHealthScore,
            recentMood: emotionalData[0]?.mood || "Unknown",
            totalCheckins: emotionalData.length,
            activities: {
              writing: { average: writingAvg, count: writingData.length },
              reading: { average: readingAvg, count: readingData.length },
              spellBee: { average: spellBeeAvg, count: spellBeeData.length },
              wordGame: { average: wordGameAvg, count: wordGameData.length },
            },
          };
        } catch (studentError) {
          return {
            id: userId,
            name: studentData.name,
            email: studentData.email || "",
            rollNo: studentData.rollNo,
            mentalAge: studentData.mentalAge || null,
            overallProgress: 0,
            mentalHealthScore: 0,
            recentMood: "Unknown",
            totalCheckins: 0,
            activities: {
              writing: { average: 0, count: 0 },
              reading: { average: 0, count: 0 },
              spellBee: { average: 0, count: 0 },
              wordGame: { average: 0, count: 0 },
            },
          };
        }
      })
    );

    const students = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// ----------------------------- STUDENT STATS ENDPOINT -----------------------------
app.get("/api/student/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [writing, reading, spellBee, wordGame, emotional] = await Promise.all([
      db.collection("writingProgress").where("userId", "==", userId).get(),
      db.collection("readingProgress").where("userId", "==", userId).get(),
      db.collection("spellBeeScores").where("userId", "==", userId).get(),
      db.collection("wordGameScores").where("userId", "==", userId).get(),
      db.collection("emotionalFeedback").where("userId", "==", userId).get(),
    ]);

    const allActivities = [
      ...writing.docs.map((d) => d.data()),
      ...reading.docs.map((d) => d.data()),
      ...spellBee.docs.map((d) => d.data()),
      ...wordGame.docs.map((d) => d.data()),
      ...emotional.docs.map((d) => d.data()),
    ];

    const activityDates = allActivities
      .map((activity) => {
        const timestamp = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
        return timestamp.toISOString().split("T")[0];
      })
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    const today = new Date().toISOString().split("T")[0];

    if (activityDates.length > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (activityDates[0] === today || activityDates[0] === yesterdayStr) {
        let checkDate = new Date(activityDates[0]);
        streak = 1;

        for (let i = 1; i < activityDates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expectedDate = checkDate.toISOString().split("T")[0];

          if (activityDates[i] === expectedDate) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    const totalActivities = allActivities.length;
    const coins = totalActivities * 10;
    const level = Math.floor(coins / 300) + 1;

    res.json({ streak, coins, level, totalActivities });
  } catch (err) {
    res.status(500).json({ error: "Failed to calculate stats" });
  }
});

// ----------------------------- DAILY CHALLENGES SYSTEM -----------------------------
app.get("/api/challenges/daily", async (req, res) => {
  try {
    const today = new Date();
    const dateKey = today.toISOString().split("T")[0];

    const challenges = [
      {
        id: 1,
        type: "writing",
        title: "Letter Practice",
        description: "Write 3 letters perfectly",
        target: 3,
        difficulty: "Easy",
        points: 50,
        icon: "✍️",
      },
      {
        id: 2,
        type: "reading",
        title: "Story Time",
        description: "Read 2 passages aloud",
        target: 2,
        difficulty: "Medium",
        points: 75,
        icon: "📖",
      },
      {
        id: 3,
        type: "spellbee",
        title: "Spelling Star",
        description: "Spell 5 words correctly",
        target: 5,
        difficulty: "Medium",
        points: 100,
        icon: "🐝",
      },
      {
        id: 4,
        type: "wordbot",
        title: "Word Battle",
        description: "Score 50 points",
        target: 50,
        difficulty: "Hard",
        points: 150,
        icon: "🎮",
      },
    ];

    res.json({
      date: dateKey,
      challenges: challenges,
      totalPossiblePoints: 375,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

app.get("/api/challenges/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [writing, reading, spellBee, wordGame] = await Promise.all([
      db.collection("writingProgress").where("userId", "==", userId).get(),
      db.collection("readingProgress").where("userId", "==", userId).get(),
      db.collection("spellBeeScores").where("userId", "==", userId).get(),
      db.collection("wordGameScores").where("userId", "==", userId).get(),
    ]);

    const filterToday = (docs) => {
      return docs.docs.filter((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
        return timestamp >= todayStart && timestamp <= todayEnd;
      });
    };

    const todayWriting = filterToday(writing);
    const todayReading = filterToday(reading);
    const todaySpellBee = filterToday(spellBee);
    const todayWordGame = filterToday(wordGame);

    const writingCount = todayWriting.length;
    const readingCount = todayReading.length;
    const correctSpellings = todaySpellBee.filter((doc) => doc.data().isCorrect === true).length;
    const wordGameScores = todayWordGame.map((doc) => doc.data().score || 0);
    const highestWordScore = wordGameScores.length > 0 ? Math.max(...wordGameScores) : 0;

    const progress = {
      writing: {
        current: writingCount,
        target: 10,
        completed: writingCount >= 10,
        pointsEarned: writingCount >= 10 ? 50 : 0,
      },
      reading: {
        current: readingCount,
        target: 2,
        completed: readingCount >= 2,
        pointsEarned: readingCount >= 2 ? 75 : 0,
      },
      spellbee: {
        current: correctSpellings,
        target: 20,
        completed: correctSpellings >= 20,
        pointsEarned: correctSpellings >= 20 ? 100 : 0,
      },
      wordbot: {
        current: highestWordScore,
        target: 50,
        completed: highestWordScore >= 50,
        pointsEarned: highestWordScore >= 50 ? 150 : 0,
      },
    };

    const totalPointsEarned =
      progress.writing.pointsEarned +
      progress.reading.pointsEarned +
      progress.spellbee.pointsEarned +
      progress.wordbot.pointsEarned;

    const completedCount = Object.values(progress).filter((p) => p.completed).length;

    res.json({
      progress: progress,
      summary: {
        completedChallenges: completedCount,
        totalChallenges: 4,
        pointsEarned: totalPointsEarned,
        totalPossible: 375,
        allCompleted: completedCount === 4,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

app.post("/api/challenges/claim", async (req, res) => {
  try {
    const { userId, pointsEarned } = req.body;
    const today = new Date().toISOString().split("T")[0];

    const existingClaim = await db
      .collection("dailyChallenges")
      .where("userId", "==", userId)
      .where("date", "==", today)
      .get();

    if (!existingClaim.empty) {
      return res.status(400).json({ error: "Already claimed today" });
    }

    await db.collection("dailyChallenges").add({
      userId: userId,
      date: today,
      pointsEarned: pointsEarned,
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Rewards claimed!", points: pointsEarned });
  } catch (err) {
    res.status(500).json({ error: "Failed to claim rewards" });
  }
});

// ----------------------------- ACHIEVEMENTS -----------------------------
app.get("/api/achievements/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [writing, reading, spellBee, wordGame, emotional] = await Promise.all([
      db.collection("writingProgress").where("userId", "==", userId).get(),
      db.collection("readingProgress").where("userId", "==", userId).get(),
      db.collection("spellBeeScores").where("userId", "==", userId).get(),
      db.collection("wordGameScores").where("userId", "==", userId).get(),
      db.collection("emotionalFeedback").where("userId", "==", userId).get(),
    ]);

    const allActivities = [
      ...writing.docs.map((d) => d.data()),
      ...reading.docs.map((d) => d.data()),
      ...spellBee.docs.map((d) => d.data()),
      ...wordGame.docs.map((d) => d.data()),
      ...emotional.docs.map((d) => d.data()),
    ];

    const activityDates = allActivities
      .map((activity) => {
        const timestamp = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
        return timestamp.toISOString().split("T")[0];
      })
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    const today = new Date().toISOString().split("T")[0];

    if (activityDates.length > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (activityDates[0] === today || activityDates[0] === yesterdayStr) {
        let checkDate = new Date(activityDates[0]);
        streak = 1;

        for (let i = 1; i < activityDates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expectedDate = checkDate.toISOString().split("T")[0];

          if (activityDates[i] === expectedDate) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    const totalActivities = allActivities.length;
    const coins = totalActivities * 10;
    const level = Math.floor(coins / 300) + 1;

    const getFirstDate = (docs) => {
      if (docs.length === 0) return null;
      const sorted = docs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeA - timeB;
      });
      return sorted[0].timestamp?.toDate?.() || null;
    };

    const writingData = writing.docs.map((d) => d.data());
    const readingData = reading.docs.map((d) => d.data());
    const spellBeeData = spellBee.docs.map((d) => d.data());
    const wordGameData = wordGame.docs.map((d) => d.data());
    const emotionalData = emotional.docs.map((d) => d.data());

    const firstReadingDate = getFirstDate(readingData);
    const firstSpellingDate = getFirstDate(spellBeeData);
    const firstWritingDate = getFirstDate(writingData);
    const firstStreakDate = streak >= 7 ? new Date() : null;

    const achievements = [
      {
        id: 1,
        name: "First Steps",
        icon: "🎯",
        earned: totalActivities > 0,
        description: "Complete your first activity",
        date: totalActivities > 0 ? getFirstDate(allActivities) : null,
        type: "milestone",
      },
      {
        id: 2,
        name: "Reading Star",
        icon: "📚",
        earned: readingData.length >= 5,
        description: "Read 5 stories",
        date: readingData.length >= 5 ? firstReadingDate : null,
        type: "milestone",
      },
      {
        id: 3,
        name: "Writing Wizard",
        icon: "✍️",
        earned: writingData.length >= 10,
        description: "Complete 10 writing exercises",
        date: writingData.length >= 10 ? firstWritingDate : null,
        type: "achievement",
      },
      {
        id: 4,
        name: "Spelling Champion",
        icon: "🏆",
        earned: spellBeeData.filter((s) => s.isCorrect).length >= 10,
        description: "Get 10 spelling words correct",
        date: spellBeeData.filter((s) => s.isCorrect).length >= 10 ? firstSpellingDate : null,
        type: "achievement",
      },
      {
        id: 5,
        name: "Word Master",
        icon: "🎮",
        earned: wordGameData.length >= 20,
        description: "Complete 20 word games",
        date: wordGameData.length >= 20 ? getFirstDate(wordGameData) : null,
        type: "challenge",
      },
      {
        id: 6,
        name: "Happy Helper",
        icon: "😊",
        earned: emotionalData.length >= 5,
        description: "Complete 5 mood check-ins",
        date: emotionalData.length >= 5 ? getFirstDate(emotionalData) : null,
        type: "streak",
      },
      {
        id: 7,
        name: "Reading Streak Master",
        icon: "🔥",
        earned: streak >= 7,
        description: "Read every day for 7 days straight",
        date: firstStreakDate,
        type: "streak",
      },
      {
        id: 8,
        name: "Creative Writer",
        icon: "✨",
        earned: writingData.length >= 3,
        description: "Write 3 letters perfectly",
        date: writingData.length >= 3 ? firstWritingDate : null,
        type: "milestone",
      },
    ];

    const formattedAchievements = achievements.map((a) => ({
      ...a,
      date: a.date ? a.date.toISOString().split("T")[0] : null,
    }));

    const earnedCount = achievements.filter((a) => a.earned).length;

    res.json({
      achievements: formattedAchievements,
      stats: {
        totalAchievements: earnedCount,
        totalBadges: earnedCount >= 6,
        currentLevel: level,
        daysLearning: activityDates.length,
        streak: streak,
        coins: coins + "",
      },
      counts: {
        reading: readingData.length,
        writing: writingData.length,
        spellBee: spellBeeData.filter((s) => s.isCorrect).length,
        wordGame: wordGameData.length,
        emotional: emotionalData.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// ----------------------------- PROGRESSIVE ACHIEVEMENTS -----------------------------
app.get("/api/progressive-achievements/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [writing, reading, spellBee, wordGame, emotional] = await Promise.all([
      db.collection("writingProgress").where("userId", "==", userId).get(),
      db.collection("readingProgress").where("userId", "==", userId).get(),
      db.collection("spellBeeScores").where("userId", "==", userId).get(),
      db.collection("wordGameScores").where("userId", "==", userId).get(),
      db.collection("emotionalFeedback").where("userId", "==", userId).get(),
    ]);

    const writingCount = writing.docs.length;
    const readingCount = reading.docs.length;
    const spellBeeCorrect = spellBee.docs.filter((d) => d.data().isCorrect).length;
    const wordGameCount = wordGame.docs.length;
    const emotionalCount = emotional.docs.length;

    const achievementDefinitions = [
      {
        id: "writing",
        title: "Writing Master",
        icon: "✍️",
        description: "Complete writing exercises",
        tiers: [
          { level: 1, target: 10, reward: { coins: 50, points: 100 } },
          { level: 2, target: 25, reward: { coins: 100, points: 200 } },
          { level: 3, target: 50, reward: { coins: 200, points: 400 } },
          { level: 4, target: 100, reward: { coins: 500, points: 1000 } },
          { level: 5, target: 200, reward: { coins: 1000, points: 2000 } },
        ],
        currentCount: writingCount,
        color: "green",
      },
      {
        id: "reading",
        title: "Reading Champion",
        icon: "📚",
        description: "Complete reading exercises",
        tiers: [
          { level: 1, target: 5, reward: { coins: 50, points: 100 } },
          { level: 2, target: 15, reward: { coins: 100, points: 200 } },
          { level: 3, target: 30, reward: { coins: 200, points: 400 } },
          { level: 4, target: 60, reward: { coins: 500, points: 1000 } },
          { level: 5, target: 100, reward: { coins: 1000, points: 2000 } },
        ],
        currentCount: readingCount,
        color: "blue",
      },
      {
        id: "spelling",
        title: "Spelling Genius",
        icon: "🐝",
        description: "Spell words correctly",
        tiers: [
          { level: 1, target: 10, reward: { coins: 50, points: 100 } },
          { level: 2, target: 30, reward: { coins: 100, points: 200 } },
          { level: 3, target: 60, reward: { coins: 200, points: 400 } },
          { level: 4, target: 100, reward: { coins: 500, points: 1000 } },
          { level: 5, target: 200, reward: { coins: 1000, points: 2000 } },
        ],
        currentCount: spellBeeCorrect,
        color: "yellow",
      },
      {
        id: "wordgame",
        title: "Word Builder Pro",
        icon: "🎮",
        description: "Complete word building games",
        tiers: [
          { level: 1, target: 10, reward: { coins: 50, points: 100 } },
          { level: 2, target: 25, reward: { coins: 100, points: 200 } },
          { level: 3, target: 50, reward: { coins: 200, points: 400 } },
          { level: 4, target: 100, reward: { coins: 500, points: 1000 } },
          { level: 5, target: 150, reward: { coins: 1000, points: 2000 } },
        ],
        currentCount: wordGameCount,
        color: "purple",
      },
      {
        id: "emotional",
        title: "Mood Expert",
        icon: "😊",
        description: "Complete mood check-ins",
        tiers: [
          { level: 1, target: 5, reward: { coins: 50, points: 100 } },
          { level: 2, target: 15, reward: { coins: 100, points: 200 } },
          { level: 3, target: 30, reward: { coins: 200, points: 400 } },
          { level: 4, target: 60, reward: { coins: 500, points: 1000 } },
          { level: 5, target: 100, reward: { coins: 1000, points: 2000 } },
        ],
        currentCount: emotionalCount,
        color: "pink",
      },
    ];

    const processedAchievements = achievementDefinitions.map((achievement) => {
      const { currentCount, tiers } = achievement;

      let currentTierIndex = 0;
      let completed = false;

      for (let i = tiers.length - 1; i >= 0; i--) {
        if (currentCount >= tiers[i].target) {
          currentTierIndex = i;
          completed = i === tiers.length - 1;
          break;
        }
      }

      let activeTierIndex = currentTierIndex;
      if (currentCount < tiers[currentTierIndex].target) {
        activeTierIndex = currentTierIndex;
      } else if (currentTierIndex < tiers.length - 1) {
        activeTierIndex = currentTierIndex + 1;
      }

      const activeTier = tiers[activeTierIndex];
      const completedTiers = tiers.filter((t) => currentCount >= t.target).length;

      const progress = currentCount;
      const target = activeTier.target;
      const percentage = Math.min((progress / target) * 100, 100);

      const stars = completedTiers;

      return {
        id: achievement.id,
        title: achievement.title,
        icon: achievement.icon,
        description: achievement.description,
        color: achievement.color,
        currentProgress: progress,
        currentTarget: target,
        percentage: Math.round(percentage),
        currentTier: activeTierIndex + 1,
        totalTiers: tiers.length,
        stars: stars,
        completedTiers: completedTiers,
        allCompleted: completed,
        nextReward: activeTier.reward,
        allTiers: tiers.map((tier, idx) => ({
          level: tier.level,
          target: tier.target,
          reward: tier.reward,
          completed: currentCount >= tier.target,
        })),
      };
    });

    const totalCompleted = processedAchievements.reduce((sum, a) => sum + a.completedTiers, 0);
    const totalPossible = processedAchievements.reduce((sum, a) => sum + a.totalTiers, 0);
    const totalStars = processedAchievements.reduce((sum, a) => sum + a.stars, 0);

    res.json({
      achievements: processedAchievements,
      stats: {
        totalCompleted: totalCompleted,
        totalPossible: totalPossible,
        totalStars: totalStars,
        completionPercentage: Math.round((totalCompleted / totalPossible) * 100),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

app.post("/api/progressive-achievements/claim", async (req, res) => {
  try {
    const { userId, achievementId, tierLevel } = req.body;
    res.json({ success: true, message: "Reward claimed successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to claim reward" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
