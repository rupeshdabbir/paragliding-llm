# Paragliding AI Assistant 🪂

A sophisticated AI-powered weather assistant for paragliding enthusiasts, providing real-time weather conditions and flying recommendations for popular paragliding locations in the Bay Area.

**Current Version**: v0.7-alpha

## 🌟 Features

- **Real-time Weather Data**: Powered by Open-Meteo's HRRR model for accurate forecasts
- **Location Support**: Coverage for key paragliding spots:
  - Mussel Rock State Park
  - Blue Rock
  - Ed Levin County Park
- **Smart Analysis**: AI-powered weather interpretation and flying condition recommendations
- **Interactive UI**: Modern, responsive chat interface with sample queries
- **Detailed Metrics**: Wind speed, direction, cloud coverage, and visibility data
- **PST Timezone**: All times displayed in Pacific Standard Time for local accuracy

## 🏗️ Architecture

### System Overview
```mermaid
graph TD
    subgraph Frontend
        UI[User Interface]
        UI -->|Query| API[Chat API]
    end

    subgraph Backend
        API -->|Fetch Data| VDB[Pinecone Vector DB]
        API -->|Weather Data| WAPI[Open-Meteo API]
        WAPI -->|HRRR Model| WD[Weather Data]
        WD -->|Store| VDB
        VDB -->|Retrieve| API
        API -->|Response| UI
    end

    subgraph AI Layer
        API -->|Process| LLM[Gemini AI]
        LLM -->|Generate| API
    end

    style Frontend fill:#f8fafc,stroke:#1e293b,stroke-width:2px
    style Backend fill:#f1f5f9,stroke:#1e293b,stroke-width:2px
    style AI Layer fill:#e2e8f0,stroke:#1e293b,stroke-width:2px
```

### Technology Stack
```mermaid
graph LR
    subgraph Frontend
        Next[Next.js]
        React[React]
        Tailwind[Tailwind CSS]
    end

    subgraph Backend
        API[Next.js API Routes]
        Pinecone[Pinecone DB]
        OpenMeteo[Open-Meteo API]
    end

    subgraph AI
        Gemini[Gemini AI]
        Embeddings[Google AI Embeddings]
    end

    Next --> React
    React --> Tailwind
    API --> Pinecone
    API --> OpenMeteo
    API --> Gemini
    Gemini --> Embeddings
    Embeddings --> Pinecone

    style Frontend fill:#f8fafc,stroke:#1e293b,stroke-width:2px
    style Backend fill:#f1f5f9,stroke:#1e293b,stroke-width:2px
    style AI fill:#e2e8f0,stroke:#1e293b,stroke-width:2px
```

### Data Flow
```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat UI
    participant A as API Route
    participant G as Gemini AI
    participant P as Pinecone
    participant W as Weather API
    
    U->>C: Submit Query
    C->>A: POST /api/chat
    A->>P: Query Similar Documents
    P-->>A: Return Weather Data
    A->>W: Fetch Current Weather
    W-->>A: Return Forecast
    A->>G: Process with LLM
    G-->>A: Generate Response
    A-->>C: Return Response
    C-->>U: Display Results
```

## 🛠️ Tech Stack

- **Frontend**:
  - Next.js 14 with App Router
  - React with TypeScript
  - Tailwind CSS for styling
  - React Markdown for content rendering

- **Backend**:
  - Next.js API Routes
  - Pinecone Vector Database
  - Google AI for embeddings
  - Open-Meteo API for weather data

- **Data Processing**:
  - TypeScript for type safety
  - Custom weather data processing
  - Vector embeddings for semantic search

## 📊 Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat UI
    participant A as API Route
    participant P as Pinecone
    participant W as Weather API
    
    U->>C: Submit Query
    C->>A: POST /api/chat
    A->>P: Query Similar Documents
    P-->>A: Return Weather Data
    A->>W: Fetch Current Weather
    W-->>A: Return Forecast
    A->>A: Process & Analyze
    A-->>C: Return Response
    C-->>U: Display Results
```

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/paragliding-ai.git
   cd paragliding-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file with:
   ```
   PINECONE_API_KEY=your_pinecone_key
   PINECONE_ENVIRONMENT=your_environment
   GOOGLE_API_KEY=your_google_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Update weather data**:
   ```bash
   npm run update-weather
   ```

## 📝 API Endpoints

### Chat API
```typescript
POST /api/chat
{
  message: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  }
}
```

### Weather Update API
```typescript
POST /api/update-weather
{
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  }
}
```

## 🔄 Weather Data Update Process

```mermaid
graph LR
    A[Fetch Weather] -->|HRRR Model| B[Process Data]
    B -->|Chunk| C[Create Embeddings]
    C -->|Store| D[Pinecone DB]
    D -->|Index| E[Vector Search]
```

## 🎨 UI Components

- **Chat Interface**: Modern, responsive design with glass-morphism effects
- **Weather Gauges**: Visual representation of wind conditions
- **Sample Queries**: Quick access to common questions
- **Markdown Support**: Rich text formatting for responses

## 🔒 Security

- Environment variables for sensitive data
- API key protection
- Rate limiting on API routes
- Input validation and sanitization

## 📈 Performance Optimization

- Vector database for fast semantic search
- Chunked weather data storage
- Efficient data processing
- Responsive UI with minimal re-renders

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Open-Meteo for weather data
- Pinecone for vector database
- Google AI for embeddings
- Next.js team for the amazing framework

## 📈 Future Plans (v0.8-alpha)

### 🔔 Smart Notifications
- Historical query tracking and analysis
- WhatsApp/Telegram integration for weather alerts
- Trend analysis for optimal flying conditions
- Custom notification preferences

### 👤 User Authentication
- Secure user login system
- Personal API key management
- Customizable weather preferences
- Saved locations and favorites

### 🗺️ Extended Location Support
- Additional Bay Area paragliding sites
- Custom location addition
- Site-specific weather patterns
- Location-based recommendations

### 🧠 Enhanced AI Capabilities
- Larger context window for better analysis
- Improved weather pattern recognition
- More detailed flying condition assessments
- Advanced trend prediction

---

Made with ❤️ for the paragliding community
