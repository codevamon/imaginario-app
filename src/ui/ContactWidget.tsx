import React from 'react';
import './ContactWidget.css';

const ContactWidget: React.FC = () => {
  return (
    <div className="contact-widget">
      <div className="contact-icon">
        <svg
          width="20"
          height="21"
          viewBox="0 0 20 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9.99992 5.06836C12.4162 5.06836 14.3749 7.02692 14.3749 9.44317C14.3749 11.025 14.3749 12.6578 14.3749 13.6239C14.3749 15.9572 15.8333 16.735 15.8333 16.735H4.16659C4.16659 16.735 5.62492 15.9572 5.62492 13.6239C5.62492 12.6578 5.62492 11.025 5.62492 9.44317C5.62492 7.02692 7.58367 5.06836 9.99992 5.06836Z"
            stroke="white"
            strokeLinejoin="round"
          />
          <path
            d="M8.33341 16.7349C8.33341 17.6553 9.07961 18.4015 10.0001 18.4015C10.9206 18.4015 11.6667 17.6553 11.6667 16.7349"
            stroke="white"
          />
          <circle cx="13.3333" cy="5.90161" r="2.5" fill="white" />
        </svg>
      </div>

      <div className="contact-info">
        <p className="contact-title h2-i _rgl">Contáctanos</p>
        <p className="contact-email p2-i _rgl">info@avesdelasierra.com</p>
      </div>
    </div>
  );
};

export default ContactWidget;
