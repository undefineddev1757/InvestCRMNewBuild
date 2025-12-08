import nodemailer from 'nodemailer'

// Створюємо транспортер для відправки email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: false, // true для 465, false для інших портів
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  })
}

// Функція для відправки email підтвердження
export async function sendVerificationEmail(email: string, token: string) {
  const transporter = createTransporter()
  
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email/confirm?token=${token}&email=${encodeURIComponent(email)}`
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Підтвердження email - InvestCRM',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">InvestCRM</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Підтвердження email адреси</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Привіт!</h2>
          <p style="color: #666; line-height: 1.6;">
            Дякуємо за реєстрацію в InvestCRM! Для завершення створення акаунта, 
            будь ласка, підтвердіть вашу email адресу, натиснувши на кнопку нижче:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              Підтвердити Email
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Якщо кнопка не працює, скопіюйте та вставте цю посилання у ваш браузер:
          </p>
          <p style="color: #667eea; word-break: break-all; font-size: 14px;">
            ${verificationUrl}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Це посилання дійсне протягом 24 годин. Якщо ви не реєструвалися в InvestCRM, 
              просто проігноруйте це повідомлення.
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
      Підтвердження email - InvestCRM
      
      Привіт!
      
      Дякуємо за реєстрацію в InvestCRM! Для завершення створення акаунта, 
      будь ласка, підтвердіть вашу email адресу, перейшовши за посиланням:
      
      ${verificationUrl}
      
      Це посилання дійсне протягом 24 годин.
      
      З повагою,
      Команда InvestCRM
    `
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error }
  }
}

// Функція для відправки email відновлення пароля
export async function sendPasswordResetEmail(email: string, token: string) {
  const transporter = createTransporter()
  
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Відновлення пароля - InvestCRM',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">InvestCRM</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Відновлення пароля</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Відновлення пароля</h2>
          <p style="color: #666; line-height: 1.6;">
            Ви отримали цей email, тому що хтось (імовірно ви) запросив відновлення пароля 
            для вашого акаунта в InvestCRM.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              Відновити Пароль
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Якщо кнопка не працює, скопіюйте та вставте цю посилання у ваш браузер:
          </p>
          <p style="color: #667eea; word-break: break-all; font-size: 14px;">
            ${resetUrl}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Це посилання дійсне протягом 1 години. Якщо ви не запитували відновлення пароля, 
              просто проігноруйте це повідомлення.
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
      Відновлення пароля - InvestCRM
      
      Ви отримали цей email, тому що хтось (імовірно ви) запросив відновлення пароля 
      для вашого акаунта в InvestCRM.
      
      Для відновлення пароля перейдіть за посиланням:
      ${resetUrl}
      
      Це посилання дійсне протягом 1 години.
      
      З повагою,
      Команда InvestCRM
    `
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('Password reset email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return { success: false, error: error }
  }
}
