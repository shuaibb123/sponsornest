from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import requests
import re
import firebase_admin
from firebase_admin import credentials, firestore
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from paddleocr import PaddleOCR
import cloudinary
import cloudinary.uploader
import cloudinary.api
from io import BytesIO
import fitz  # PyMuPDF
from PIL import Image

# Initialize Cloudinary
cloudinary.config(
    cloud_name="dagjegon7",
    api_key="488548572394979",
    api_secret="MwE6G2cGcHFUJM9aj1SsmcCwSgw",
    secure=True
)

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

# Initialize PaddleOCR
ocr_engine = PaddleOCR(use_angle_cls=True, lang='en')


# Add these configurations at the top (use environment variables in production)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = "shuaibahamed68@gmail.com"  # Replace with your email
EMAIL_PASSWORD = "oyto lugm ltdt oeta"   # Use app-specific password

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/send-sponsor-emails', methods=['POST'])
def send_sponsor_emails():
    try:
        data = request.json
        event_data = data.get('event')
        sponsors = data.get('sponsors')
        
        if not event_data:
            return jsonify({"error": "Missing event data"}), 400
            
        # Don't proceed if there are no sponsors to email
        if not sponsors:
            return jsonify({"message": "No sponsors to notify - no matches found"}), 200

        # Connect to SMTP server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)

        sent_count = 0
        
        # Send emails to each sponsor
        for sponsor in sponsors:
            # Only send if sponsor has actual matched criteria (not just "willing to sponsor other")
            if sponsor.get('matchedCriteria') and len(sponsor['matchedCriteria']) > 0:
                try:
                    msg = MIMEMultipart()
                    msg['From'] = EMAIL_ADDRESS
                    msg['To'] = sponsor['email']
                    msg['Subject'] = f"Sponsorship Opportunity: {event_data['EventName']}"

                    body = f"""
                    <html>
                        <body>
                            <h2>New Sponsorship Opportunity</h2>
                            <p>Hello {sponsor['businessName']},</p>
                            
                            <p>We found a potential event that matches your sponsorship criteria:</p>
                            
                            <h3>Event Details:</h3>
                            <ul>
                                <li><strong>Event Name:</strong> {event_data['EventName']}</li>
                                <li><strong>Date:</strong> {event_data['EventDate']}</li>
                                <li><strong>Location:</strong> {event_data['locationOfTheEvent']}</li>
                                <li><strong>Expected Crowd:</strong> {event_data['expectedCrowd']}</li>
                            </ul>
                            
                            <p>This event matches your criteria for: {', '.join(sponsor['matchedCriteria'])}</p>
                            
                            {event_data.get('proposalUrl') and f'''
                <p>
                    <strong>Sponsorship Proposal:</strong> 
                    <a href="{event_data['proposalUrl']}" target="_blank">Download Proposal PDF</a>
                </p>
                ''' or ''}
                            <p>If you're interested in sponsoring this event, please contact the event organizer.</p>
                            
                            <p>Best regards,<br>Event Sponsorship Platform</p>
                        </body>
                    </html>
                    """

                    msg.attach(MIMEText(body, 'html'))
                    server.send_message(msg)
                    sent_count += 1
                    
                    # Create sponsorship request in Firestore
                    request_data = {
                        "eventId": event_data.get('eventId'),
                        "eventName": event_data['EventName'],
                        "eventDate": event_data['EventDate'],
                        "eventLocation": event_data['locationOfTheEvent'],
                        "requestingUserId": data.get('userId'),
                        "requestingUserType": data.get('userType', 'seeker'),
                        "status": "pending",
                        "createdAt": firestore.SERVER_TIMESTAMP,
                        "matchedCriteria": sponsor['matchedCriteria'],
                        "expectedCrowd": event_data['expectedCrowd'],
                        "eventDescription": event_data.get('description', ''),
                        "proposalUrl": event_data.get('proposalUrl'),
                        "posterUrl": event_data.get('posterUrl')  # Add this line
                    }
                    
                    # Add to provider's sponsorshipRequests collection
                    db.collection("providers").document(sponsor['providerId']).collection("sponsorshipRequests").add(request_data)
                    
                except Exception as e:
                    print(f"Error sending email to {sponsor['email']}: {str(e)}")
                    continue

        server.quit()
        
        if sent_count > 0:
            return jsonify({
                "message": f"Emails sent to {sent_count} sponsors",
                "requests_created": sent_count
            })
        else:
            return jsonify({
                "message": "No emails sent - no sponsors with matching criteria",
                "requests_created": 0
            })

    except Exception as e:
        print(f"Error in send-sponsor-emails: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/notify-user', methods=['POST'])
def notify_user():
    try:
        data = request.json
        user_email = data.get('userEmail')
        user_id = data.get('userId')
        event_name = data.get('eventName')
        provider_name = data.get('providerName')
        user_type = data.get('userType', 'seeker').lower()  # Default to seeker

        if not all([user_email, user_id, event_name, provider_name]):
            return jsonify({"error": "Missing required data"}), 400

        # Validate user type
        if user_type not in ['seeker', 'entity']:
            return jsonify({"error": "Invalid user type"}), 400

        # Create notification in Firestore
        collection_name = "entities" if user_type == "entity" else "seekers"
        notifications_ref = db.collection(collection_name).document(user_id).collection("notifications")
        
        notification_data = {
            "providerName": provider_name,
            "eventName": event_name,
            "message": f"{provider_name} is interested in sponsoring your event: {event_name}",
            "timestamp": firestore.SERVER_TIMESTAMP,
            "read": False,
            "type": "sponsorship_interest"
        }
        
        # Add notification
        notification_ref = notifications_ref.document()
        notification_ref.set(notification_data)

        # Send email notification
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)

        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = user_email
        msg['Subject'] = f"New Sponsorship Interest: {event_name}"

        body = f"""
        <html>
            <body>
                <h2>Sponsorship Interest Notification</h2>
                <p>Hello,</p>
                <p>We're excited to inform you that <strong>{provider_name}</strong> has expressed interest in sponsoring your event:</p>
                
                <h3>Event Details</h3>
                <ul>
                    <li><strong>Event Name:</strong> {event_name}</li>
                </ul>
                
                <p>Please log in to your SponsorNest dashboard to view more details and respond to this opportunity.</p>
                
                <p>Best regards,<br>The SponsorNest Team</p>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        server.send_message(msg)
        server.quit()

        return jsonify({
            "success": True,
            "message": f"Successfully notified {user_type}",
            "notificationId": notification_ref.id
        })

    except Exception as e:
        print(f"Error in notify-user: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to send notification: {str(e)}"
        }), 500

@app.route('/find-sponsors', methods=['POST'])
def find_sponsors():
    data = request.json
    event_data = data.get('eventData', {})
    event_criteria = [
        ec.lower().strip() 
        for ec in data.get("eventCriteria", [])
        if ec.lower().strip() not in ['event', 'events']
    ]
    
    if not event_criteria and data.get("eventCriteria"):
        event_criteria = [data.get("eventCriteria")[0].lower().strip()]
    
    print(f"Filtered criteria: {event_criteria}")

    try:
        providers_ref = db.collection("providers")
        all_providers = list(providers_ref.stream())

        matched_sponsors = []
        generic_terms = {'event', 'events'}
        
        for provider in all_providers:
            provider_data = provider.to_dict()
            provider_criteria = provider_data.get("selectedEventCriteria", [])
            provider_criteria_normalized = [
                pc.lower().strip() 
                for pc in provider_criteria
                if pc.lower().strip() not in generic_terms
            ]
            
            matches = set()
            proposal_url = event_data.get('proposalUrl')
            poster_url = event_data.get('posterUrl')
            
            # Only check for matches if both event and provider have criteria
            if event_criteria and provider_criteria_normalized:
                # Find exact matches (case-insensitive)
                matches = set(event_criteria).intersection(set(provider_criteria_normalized))
            
            
            
            # Only add to matched_sponsors if there are actual exact matches
            if matches:
                # Create sponsorship request for this provider
                request_data = {
            "eventId": data.get("eventId"),
            "eventName": event_data.get("EventName"),
            "eventDate": event_data.get("EventDate"),
            "eventLocation": event_data.get("locationOfTheEvent"),
            "requestingUserId": data.get("userId"),
            "requestingUserType": data.get("userType", "seeker"),
            "status": "pending",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "matchedCriteria": list(matches),
            "expectedCrowd": event_data.get("expectedCrowd"),
            "eventDescription": event_data.get("description"),
            "proposalUrl": proposal_url,  # Add the proposal URL here
            "posterUrl": poster_url  # Add poster URL here
        }

                
                # Add to provider's sponsorshipRequests collection
                sponsorship_request_ref = db.collection("providers").document(provider.id).collection("sponsorshipRequests").add(request_data)
                
                # Add a corresponding entry in the seeker's sponsorshipResponses
                user_id = data.get("userId")
                user_type = data.get("userType", "seeker")
                if user_id:
                    collection_name = "entities" if user_type == "entity" else "seekers"
                    response_data = {
                        "providerId": provider.id,
                        "providerName": provider_data.get("businessName"),
                        "eventId": data.get("eventId"),
                        "eventName": data.get("eventData", {}).get("EventName"),
                        "status": "pending",
                        "requestSentAt": firestore.SERVER_TIMESTAMP,
                        "sponsorshipRequestId": sponsorship_request_ref[1].id
                    }
                    db.collection(collection_name).document(user_id).collection("sponsorshipResponses").add(response_data)

                matched_sponsors.append({
                    "businessName": provider_data.get("businessName"),
                    "businessType": provider_data.get("businessType"),
                    "email": provider_data.get("email"),
                    "sponsorshipAmount": provider_data.get("sponsorshipAmount"),
                    "eventCount": provider_data.get("eventCount"),
                    "matchedCriteria": list(matches),
                    "matchStrength": len(matches),
                    "providerId": provider.id
                })

        # Only include willing-to-sponsor-other if no exact matches were found
        if not matched_sponsors:
            for provider in all_providers:
                provider_data = provider.to_dict()
                if provider_data.get("willingToSponsorOtherCriteria", False):
                    matched_sponsors.append({
                        "businessName": provider_data.get("businessName"),
                        "businessType": provider_data.get("businessType"),
                        "email": provider_data.get("email"),
                        "sponsorshipAmount": provider_data.get("sponsorshipAmount"),
                        "eventCount": provider_data.get("eventCount"),
                        "matchedCriteria": [],
                        "note": "Willing to sponsor other event types",
                        "matchStrength": 0,
                        "providerId": provider.id
                    })

        return jsonify({
            "sponsorMatches": matched_sponsors,
            "message": f"Found {len(matched_sponsors)} potential sponsors"
        })

    except Exception as e:
        print(f"Error in find-sponsors: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/events', methods=['POST'])
def submit_event():
    try:
        event_data = request.form.to_dict()
        user_id = event_data.get('userId')
        user_type = event_data.get('userType')
        
        if not user_id or user_type not in ['seeker', 'entity']:
            return jsonify({"error": "Invalid user information"}), 400

        proposal_url = None
        poster_url = None
        
        # Handle proposal file upload
        if 'proposalFile' in request.files:
            proposal_file = request.files['proposalFile']
            if proposal_file.filename != '':
                proposal_url = upload_file_to_cloudinary(proposal_file, "sponsorship_app/proposals")
        
        # Handle poster file upload
        if 'posterFile' in request.files:
            poster_file = request.files['posterFile']
            if poster_file.filename != '':
                poster_url = upload_file_to_cloudinary(poster_file, "sponsorship_app/posters")

        # Validate required fields and save to Firestore
        required_fields = ['EventName', 'EventDate', 'locationOfTheEvent', 'expectedCrowd']
        if not all(field in event_data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        collection_name = "entities" if user_type == "entity" else "seekers"
        event_ref = db.collection(collection_name).document(user_id).collection("events").document()
        
        event_data.update({
            "proposalUrl": proposal_url,
            "posterUrl": poster_url,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "status": "active"
        })
        
        event_ref.set(event_data)

        return jsonify({
            "success": True,
            "eventId": event_ref.id,
            "proposalUrl": proposal_url,
            "posterUrl": poster_url,
            "userType": user_type
        }), 200

    except Exception as e:
        print(f"Error in /events: {str(e)}")
        return jsonify({"error": str(e)}), 500

from PIL import Image
from io import BytesIO
import fitz  # PyMuPDF
import cloudinary.uploader

def upload_file_to_cloudinary(file, folder):
    try:
        file_bytes = file.read()
        
        # Handle PDF files
        if file.filename.lower().endswith('.pdf'):
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            images = []
            for page in doc:
                pix = page.get_pixmap()
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                images.append(img)
            
            if images:
                if len(images) <= 3:
                    # Combine horizontally
                    heights = [img.height for img in images]
                    widths = [img.width for img in images]
                    total_width = sum(widths)
                    max_height = max(heights)
                    
                    combined = Image.new('RGB', (total_width, max_height))
                    x_offset = 0
                    for img in images:
                        combined.paste(img, (x_offset, 0))
                        x_offset += img.width
                else:
                    # Combine vertically
                    widths = [img.width for img in images]
                    heights = [img.height for img in images]
                    max_width = max(widths)
                    total_height = sum(heights)
                    
                    combined = Image.new('RGB', (max_width, total_height))
                    y_offset = 0
                    for img in images:
                        combined.paste(img, (0, y_offset))
                        y_offset += img.height

                # Convert final image to bytes
                img_byte_arr = BytesIO()
                combined.save(img_byte_arr, format='JPEG', quality=85)
                img_byte_arr.seek(0)

                # Upload to Cloudinary
                upload_result = cloudinary.uploader.upload(
                    img_byte_arr,
                    folder=folder,
                    resource_type="image"
                )
                return upload_result['secure_url']
        
        # Handle non-PDF image files
        upload_result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="auto"
        )
        return upload_result['secure_url']
    
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise



def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text(image_path):
    import os
    try:
        if not os.path.exists(image_path):
            print(f"File not found: {image_path}")
            return ""

        print(f"Running OCR on: {image_path}")

        result = ocr_engine.predict(image_path)
        print("OCR Result:", result)

        if not result or not isinstance(result, list) or not result[0].get('rec_texts'):
            return ""

        # Extract recognized text list from the first dict in the result
        extracted_text = "\n".join(result[0]['rec_texts'])
        return extracted_text

    except Exception as e:
        print(f"PaddleOCR error: {e}")
        return ""



@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file format"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    extracted_text = extract_text(file_path)
    if not extracted_text:
        return jsonify({"error": "Failed to extract text from image"}), 500

    try:
        # Use Gemini to extract structured data
        prompt = f"""
        From the following text, extract the event details and return them as a JSON object.
        The JSON object should have the following keys: "EventName", "EventDate", "locationOfTheEvent", "description", "expectedCrowd", "eventCriteria","EventDate".
        Th "EventDate" must be in the format of mm/dd/yyy
        The "locationOfTheEvent" should be a physical address, not a website or URL.
        The "eventCriteria" must be one of the following: "career event","cultural event","sport event","charity event","Entertainment event",
        If a value is not found, leave it as an empty string.

        Text:
        {extracted_text}
        """
        
        api_key = "AIzaSyC1glCHcCGyNhf0S3ziSedGp-6WaLQs9qc"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

        headers = {
            'Content-Type': 'application/json'
        }

        data = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }

        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()

        gemini_response_text = response.json()['candidates'][0]['content']['parts'][0]['text']
        
        json_match = re.search(r'```json\n({.*?})\n```', gemini_response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
            extracted_data = json.loads(json_str)
        else:
            extracted_data = {}

        return jsonify({
            "extracted_text": extracted_text,
            "extracted_data": extracted_data
        })

    except Exception as e:
        print(f"Error processing with AI: {e}")
        return jsonify({"error": "Failed to process text with AI"}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
