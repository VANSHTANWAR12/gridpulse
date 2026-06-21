import os
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from gridpulse.database import get_events_with_recommendations

def chunk_markdown(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    chunks = []
    lines = content.split('\n')
    current_chunk = []
    current_header = "Introduction"
    
    for line in lines:
        if line.startswith('#'):
            if current_chunk:
                chunks.append({
                    'source': os.path.basename(filepath),
                    'header': current_header,
                    'text': '\n'.join(current_chunk).strip()
                })
                current_chunk = []
            current_header = line.strip()
        current_chunk.append(line)
        
    if current_chunk:
        chunks.append({
            'source': os.path.basename(filepath),
            'header': current_header,
            'text': '\n'.join(current_chunk).strip()
        })
        
    return [c for c in chunks if len(c['text']) > 50]
class RAGEngine:
    def __init__(self):
        self.chunks = []
        self.chat_history = []
        self.reset_chat()
        
    def reset_chat(self):
        self.chat_history = []
        
        # Load environment variables from local .env file if available
        if os.path.exists(".env"):
            try:
                with open(".env", "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ[k.strip()] = v.strip().strip('"').strip("'")
            except Exception as e:
                print(f"Error loading local .env file: {e}")

        self.gemini_key = os.environ.get("GEMINI_API_KEY")
        self.vectorizer = None
        self.tfidf_matrix = None
        self.gemini_enabled = False
        
        # Load and chunk documents
        self.load_documents()
        
        # Initialize search matrix
        self.init_tfidf()
        
        if self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                self.genai = genai
                self.gemini_enabled = True
                print("Gemini AI model configured successfully for RAG.")
            except Exception as e:
                print(f"Error configuring Gemini AI, running in local fallback: {e}")
                self.gemini_enabled = False
        else:
            print("GEMINI_API_KEY not found in environment. Running in offline template-matching mode.")

    def load_documents(self):
        docs = [
            "architecture_system_design.md",
            "gridpulse/data/traffic_sop.md"
        ]
        for doc in docs:
            if os.path.exists(doc):
                self.chunks.extend(chunk_markdown(doc))
        print(f"Loaded {len(self.chunks)} chunks from documentation files.")

    def init_tfidf(self):
        if not self.chunks:
            return
        self.vectorizer = TfidfVectorizer(stop_words='english')
        texts = [c['text'] for c in self.chunks]
        self.tfidf_matrix = self.vectorizer.fit_transform(texts)

    def retrieve_chunks(self, query, top_n=3):
        if not self.chunks or not self.vectorizer:
            return []
        
        query_vec = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
        top_indices = np.argsort(similarities)[::-1][:top_n]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.02:  # similarity threshold
                results.append({
                    'chunk': self.chunks[idx],
                    'similarity': float(similarities[idx])
                })
        return results

    def query(self, query_text, lang='en'):
        # 1. Fetch live system context from database
        db_events = get_events_with_recommendations()
        active_events = [e for e in db_events if e.get('status', '').lower() == 'active']
        
        # Build high-level summary counts to keep prompt size optimized
        priority_counts = {}
        cause_counts = {}
        for e in active_events:
            p = e.get('priority', 'Medium')
            priority_counts[p] = priority_counts.get(p, 0) + 1
            c = e.get('event_cause', 'others').replace('_', ' ')
            cause_counts[c] = cause_counts.get(c, 0) + 1
            
        p_str = ", ".join([f"{count} {p}" for p, count in priority_counts.items()])
        c_str = ", ".join([f"{count} {c}" for c, count in cause_counts.items()])
        
        active_summary = f"Currently, there are {len(active_events)} active traffic incidents in Bengaluru ({p_str}). Breakdown by cause: {c_str}.\n"
        
        # List details for top 10 highest-severity incidents only
        sorted_events = sorted(active_events, key=lambda x: x.get('severity_score', 0) or 0, reverse=True)
        limit_n = 10
        if sorted_events:
            active_summary += f"Here are the details for the top {min(limit_n, len(sorted_events))} highest severity active incidents:\n"
            for idx, e in enumerate(sorted_events[:limit_n], 1):
                active_summary += f" - [{idx}] ID: {e['id']}, Cause: {e['event_cause'].replace('_', ' ')}, Priority: {e['priority']}, Location: {e['address']}, Severity: {e['severity_score']}%, Manpower: {e['manpower_needed']} Officers, Barricades: {e['barricades_needed']} pcs, Diversion Sign: '{e['diversion_sign']}'\n"
        
        # 2. Retrieve document context
        retrieved = self.retrieve_chunks(query_text, top_n=3)
        # Token optimization: limit retrieved SOP/document chunks to top 2 if similarity is low (< 0.1)
        if len(retrieved) > 2 and retrieved[2]['similarity'] < 0.1:
            retrieved = retrieved[:2]
        doc_context = "\n\n".join([f"Source: {r['chunk']['source']}\n{r['chunk']['text']}" for r in retrieved])
        
        lang_instruction = ""
        if lang == 'kn':
            lang_instruction = "IMPORTANT: You MUST write your entire response in Kannada (ಕನ್ನಡ) language only. Translate all operational terms, descriptions, and advice accurately into Kannada."
        elif lang == 'hi':
            lang_instruction = "IMPORTANT: You MUST write your entire response in Hindi (हिन्दी) language only. Translate all operational terms, descriptions, and advice accurately into Hindi."
        else:
            lang_instruction = "IMPORTANT: Respond in English."

        system_prompt = f"""You are the GridPulse Operations Copilot, an AI assistant helping operators at the Astram Traffic Command Center in Bengaluru.
You have access to live database state, traffic Standard Operating Procedures (SOPs), and the system architecture design.

Live Database State (Active Incidents):
{active_summary}

Relevant Documentation Context:
{doc_context}

Guidelines:
1. Base your operational advice on the provided SOP guidelines and the active incidents.
2. If asked about the system structure or engineering pipelines, refer to the System Design Spec.
3. Be professional, direct, and concise. Give concrete recommendations.
4. Respond in markdown format.
5. If the query asks about active incidents, read the counts and details from the Live Database section.
6. {lang_instruction}
"""
        
        if self.gemini_enabled:
            try:
                model = self.genai.GenerativeModel(
                    model_name="gemini-3.1-flash-lite",
                    system_instruction=system_prompt
                )
                
                # Format self.chat_history and append current query to pass to generate_content
                contents = []
                for msg in self.chat_history:
                    contents.append({
                        'role': msg['role'],
                        'parts': msg['parts']
                    })
                contents.append({
                    'role': 'user',
                    'parts': [query_text]
                })
                
                response = model.generate_content(contents)
                
                # Append user message and model response to history
                self.chat_history.append({'role': 'user', 'parts': [query_text]})
                self.chat_history.append({'role': 'model', 'parts': [response.text]})
                
                # Enforce sliding window history: keep only last 6 messages
                if len(self.chat_history) > 6:
                    self.chat_history = self.chat_history[-6:]
                
                return {
                    'response': response.text,
                    'retrieved_sources': [r['chunk'] for r in retrieved],
                    'mode': 'Gemini AI Online'
                }
            except Exception as e:
                print(f"Gemini API query failed, falling back: {e}")
                # Fall through to offline fallback
        
        return self._generate_offline_response(query_text, active_events, retrieved, lang=lang)

    def _generate_offline_response(self, query, active_events, retrieved, lang='en'):
        query_lower = query.lower()
        
        # Rule-based memory heuristic for offline mode:
        # If the query is ambiguous/short and has referencing terms, use classification from the last query
        has_pronouns = any(re.search(rf"\b{pronoun}\b", query_lower) for pronoun in ["it", "its", "that", "this", "them", "those", "there", "prev", "previous", "last", "above"])
        
        is_incident_summary = any(k in query_lower for k in ["summary", "active", "list", "status", "incident", "accident", "happen", "current"])
        is_sop_check = any(k in query_lower for k in ["sop", "rule", "procedure", "guide", "protocol", "barrier", "officer", "manpower", "close"])
        
        # If no clear intent, and there are pronouns / references, check the last query
        if not is_incident_summary and not is_sop_check and has_pronouns and self.chat_history:
            last_user_msgs = [m for m in self.chat_history if m['role'] == 'user']
            if last_user_msgs:
                last_query = last_user_msgs[-1]['parts'][0].lower()
                is_incident_summary = any(k in last_query for k in ["summary", "active", "list", "status", "incident", "accident", "happen", "current"])
                is_sop_check = any(k in last_query for k in ["sop", "rule", "procedure", "guide", "protocol", "barrier", "officer", "manpower", "close"])
        
        response_parts = []
        
        if is_incident_summary:
            if lang == 'kn':
                response_parts.append("### ಸಕ್ರಿಯ ಕಮಾಂಡ್ ಸೆಂಟರ್ ಸ್ಥಿತಿ (ಸ್ಥಳೀಯ ಡೇಟಾಬೇಸ್ ಪ್ರಶ್ನೆ)")
                response_parts.append(f"ಬೆಂಗಳೂರಿನಲ್ಲಿ ಒಟ್ಟು **{len(active_events)} ಸಕ್ರಿಯ ಸಂಚಾರ ಘಟನೆಗಳು** ಇವೆ.")
                if active_events:
                    for e in active_events:
                        c_kn = {'accident': 'ಅಪಘಾತ', 'water_logging': 'ಪ್ರವಾಹ/ನೀರು ನಿಲ್ಲುವುದು', 'vehicle_breakdown': 'ವಾಹನ ಕೆಟ್ಟಿರುವುದು', 'construction': 'ರಸ್ತೆ ಕಾಮಗಾರಿ'}.get(e['event_cause'], e['event_cause'].replace('_', ' '))
                        response_parts.append(
                            f"- **{e['id']}** ({e['priority']} ಆದ್ಯತೆ): {c_kn} ಸ್ಥಳ: *{e['address'].split(',')[0]}*. "
                            f"ತೀವ್ರತೆ: **{e['severity_score']}%**. ನಿಯೋಜನೆ: **{e['manpower_needed']} ಪೊಲೀಸರು** ಮತ್ತು **{e['barricades_needed']} ಬ್ಯಾರಿಕೇಡ್‌ಗಳು**."
                        )
            elif lang == 'hi':
                response_parts.append("### लाइव कमांड सेंटर स्थिति (स्थानीय डेटाबेस क्वेरी)")
                response_parts.append(f"बेंगलुरु में **{len(active_events)} सक्रिय यातायात घटनाएं** हैं।")
                if active_events:
                    for e in active_events:
                        c_hi = {'accident': 'दुर्घटना', 'water_logging': 'जलभराव', 'vehicle_breakdown': 'वाहन खराब होना', 'construction': 'सड़क निर्माण'}.get(e['event_cause'], e['event_cause'].replace('_', ' '))
                        response_parts.append(
                            f"- **{e['id']}** ({e['priority']} प्राथमिकता): {c_hi} स्थान: *{e['address'].split(',')[0]}*. "
                            f"तीव्रता: **{e['severity_score']}%**. तैनाती: **{e['manpower_needed']} पुलिसकर्मी** और **{e['barricades_needed']} बैरिकेड**."
                        )
            else:
                response_parts.append("### Live Command Center Status (Local Database query)")
                response_parts.append(f"There are **{len(active_events)} active traffic incidents** in Bengaluru.")
                if active_events:
                    for e in active_events:
                        response_parts.append(
                            f"- **{e['id']}** ({e['priority']} Priority): {e['event_cause'].replace('_', ' ')} at *{e['address'].split(',')[0]}*. "
                            f"Severity: **{e['severity_score']}%**. Resources deployed: **{e['manpower_needed']} officers** and **{e['barricades_needed']} barricades**."
                        )
            if not active_events:
                msg = "ಯಾವುದೇ ಸಕ್ರಿಯ ಘಟನೆಗಳಿಲ್ಲ." if lang == 'kn' else ("कोई सक्रिय घटना नहीं है।" if lang == 'hi' else "No active traffic bottlenecks are currently reported.")
                response_parts.append(msg)
                
        elif is_sop_check:
            title = "### SOP ಮಾರ್ಗಸೂಚಿಗಳು (Retrieved from traffic_sop.md)" if lang == 'kn' else ("### एसओपी दिशानिर्देश (Retrieved from traffic_sop.md)" if lang == 'hi' else "### SOP Guidelines & Resource Allocation rules (Retrieved from traffic_sop.md)")
            response_parts.append(title)
            sop_chunks = [r['chunk']['text'] for r in retrieved if r['chunk']['source'] == 'traffic_sop.md']
            if sop_chunks:
                response_parts.extend(sop_chunks)
            else:
                if lang == 'kn':
                    response_parts.append("ಸಂಪನ್ಮೂಲ ಲೆಕ್ಕಾಚಾರಕ್ಕಾಗಿ SOP ನಿಯಮಗಳು:")
                    response_parts.append("- **ಪೊಲೀಸರು**: ತೀವ್ರತೆ / 15 + ರಸ್ತೆ ಮುಚ್ಚುವಿಕೆ(3) + ಅಪಘಾತ(2).")
                    response_parts.append("- **ಬ್ಯಾರಿಕೇಡ್‌ಗಳು**: ರಸ್ತೆ ಮುಚ್ಚುವಿಕೆ (ತೀವ್ರತೆ / 5), ನಿರ್ಮಾಣ (ತೀವ್ರತೆ / 8).")
                elif lang == 'hi':
                    response_parts.append("संसाधन गणना के लिए एसओपी नियम:")
                    response_parts.append("- **पुलिसकर्मी**: तीव्रता / 15 + सड़क बंदी(3) + दुर्घटना(2).")
                    response_parts.append("- **बैरिकेड**: सड़क बंदी (तीव्रता / 5), निर्माण (तीव्रता / 8).")
                else:
                    response_parts.append("Refer to the Standard Operating Procedures for resource calculation:")
                    response_parts.append("- **Officers**: Severity / 15 + road_closure(3) + accident(2).")
                    response_parts.append("- **Barricades**: Road closure (Severity / 5), construction (Severity / 8), breakdown (2 warnings).")
        else:
            title = "### ಆಪರೇಷನ್ಸ್ ಕೊಪೈಲಟ್ (ಸ್ಥಳೀಯ ಹುಡುಕಾಟ)" if lang == 'kn' else ("### ऑपरेशंस कोपायलट (स्थानीय खोज)" if lang == 'hi' else "### Operations Copilot (Offline Local Retrieval)")
            response_parts.append(title)
            for idx, r in enumerate(retrieved, 1):
                chunk = r['chunk']
                response_parts.append(f"\n#### [{idx}] Source: {chunk['source']} | Header: {chunk['header']}\n{chunk['text']}")
                
        note = "\n\n> [!NOTE]\n> ಚಾಲನೆಯಲ್ಲಿದೆ **ಸ್ಥಳೀಯ ಆಫ್‌ಲೈನ್ ಮೋಡ್**. Gemini ಸಕ್ರಿಯಗೊಳಿಸಲು `GEMINI_API_KEY` ಕಾನ್ಫಿಗರ್ ಮಾಡಿ." if lang == 'kn' else ("\n\n> [!NOTE]\n> चल रहा है **स्थानीय ऑफ़लाइन मोड**। जेमिनी सक्रिय करने के लिए `GEMINI_API_KEY` कॉन्फ़िगर करें।" if lang == 'hi' else "\n\n> [!NOTE]\n> Running in **Local Offline Mode**. Export `GEMINI_API_KEY` to enable full conversational LLM capabilities.")
        response_parts.append(note)
        
        offline_res = {
            'response': "\n".join(response_parts),
            'retrieved_sources': [r['chunk'] for r in retrieved],
            'mode': 'Local Offline Template'
        }
        
        # Append to self.chat_history to maintain context even in offline mode
        self.chat_history.append({'role': 'user', 'parts': [query]})
        self.chat_history.append({'role': 'model', 'parts': [offline_res['response']]})
        if len(self.chat_history) > 6:
            self.chat_history = self.chat_history[-6:]
            
        return offline_res
