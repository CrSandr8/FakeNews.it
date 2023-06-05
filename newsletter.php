<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once 'vendor/autoload.php';

// Connessione al DB
$db = pg_connect("host=horton.db.elephantsql.com dbname=dxeyhugp user=dxeyhugp password=GrDEM1FdeRba7cH3KQT1MPajUGBWytj0");

// Fetch delle email degli utenti che hanno richiesto di ricevere la newsletter
$query = 'SELECT email FROM users WHERE newsletter = true';
$res = pg_query($db, $query);

$mail = new PHPMailer(true);

try {
    // Impostazione Server
    $mail->SMTPDebug = SMTP::DEBUG_SERVER;
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'theaitimesit@gmail.com';
    $mail->Password = "";
    $mail->SMTPSecure = 'ssl';
    $mail->Port = 465;

    // Mittente
    $mail->setFrom('theaitimesit@gmail.com', 'TheAiTimes');

    // Destinatari
    while ($row = pg_fetch_assoc($res)) {
        $mail->addAddress($row['email']);
    }

    $titlesRes = pg_query($db, "SELECT title FROM news ORDER BY unique_id DESC");

    $title1 = pg_fetch_assoc($titlesRes);
    $title2 = pg_fetch_assoc($titlesRes);
    $title3 = pg_fetch_assoc($titlesRes);
    $title4 = pg_fetch_assoc($titlesRes);
    
    // Contenuto della mail
    $mail->isHTML(true);
    $mail->Subject = 'The AI Times Newsletter - Stay Informed with Today\'s Headlines!';
    $mail->Body = "
        <html>
        <body>
            <h2>Hello User!</h2>

            <h3>Thank you for subscribing to The AI Times newsletter. We're excited to have you on board!</h3>

            <p>Every day, we use cutting-edge AI technology to generate news articles that cover a wide range of topics, including politics, economy, science, and sports. Our goal is to provide you with timely and relevant news in an innovative and engaging way.</p>

            <p>Here are today's top headlines:</p>

            <ul>
                <li>" . $title1["title"] . "</li>
                <li>" . $title2["title"] . "</li>
                <li>" . $title3["title"] . "</li>
                <li>" . $title4["title"] . "</li>
            </ul>

            <div>To read the full articles, <a href='httplocalhost:51555'>visit our website</a></div>

            <p>Stay informed with The AI Times and explore the exciting world of AI-powered news. If you have any questions or feedback, feel free to reach out to us.</p>

            <p>Thank you once again for subscribing. We hope you enjoy your reading experience!</p>

            <p>Best regards,<br>
            The AI Times Team</p>
        </body>
        </html>
        ";

    $mail->send();
    echo 'Message has been sent';
} catch (Exception $e) {
    echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
}
