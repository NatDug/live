import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaGasPump, FaTruck, FaStore, FaMapMarkerAlt, FaCreditCard, FaShieldAlt } from 'react-icons/fa';

const LandingPage = () => {
  return (
    <Container>
      {/* Hero Section */}
      <HeroSection>
        <HeroContent>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <HeroTitle>
              Fuel Delivered to Your <span>Doorstep</span>
            </HeroTitle>
            <HeroSubtitle>
              WeFuel brings convenience to Johannesburg with on-demand fuel delivery. 
              Order petrol or diesel and get it delivered within minutes.
            </HeroSubtitle>
            <HeroButtons>
              <PrimaryButton as={Link} to="/user/signup">
                Order Fuel Now
              </PrimaryButton>
              <SecondaryButton as={Link} to="/driver/signup">
                Become a Driver
              </SecondaryButton>
            </HeroButtons>
          </motion.div>
        </HeroContent>
        <HeroImage>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GasPumpIcon />
          </motion.div>
        </HeroImage>
      </HeroSection>

      {/* Features Section */}
      <FeaturesSection>
        <SectionTitle>Why Choose WeFuel?</SectionTitle>
        <FeaturesGrid>
          <FeatureCard>
            <FeatureIcon>
              <FaMapMarkerAlt />
            </FeatureIcon>
            <FeatureTitle>Real-time Tracking</FeatureTitle>
            <FeatureDescription>
              Track your fuel delivery in real-time with live driver location updates.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <FaCreditCard />
            </FeatureIcon>
            <FeatureTitle>Secure Payments</FeatureTitle>
            <FeatureDescription>
              Pay securely with card, instant EFT, or cash. Multiple payment options available.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <FaShieldAlt />
            </FeatureIcon>
            <FeatureTitle>FICA Compliant</FeatureTitle>
            <FeatureDescription>
              Fully compliant with South African regulations and safety standards.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <FaGasPump />
            </FeatureIcon>
            <FeatureTitle>Quality Fuel</FeatureTitle>
            <FeatureDescription>
              Premium quality fuel from trusted stations across Johannesburg.
            </FeatureDescription>
          </FeatureCard>
        </FeaturesGrid>
      </FeaturesSection>

      {/* User Types Section */}
      <UserTypesSection>
        <SectionTitle>Join the WeFuel Ecosystem</SectionTitle>
        <UserTypesGrid>
          <UserTypeCard as={Link} to="/user/signup">
            <UserTypeIcon>
              <FaGasPump />
            </UserTypeIcon>
            <UserTypeTitle>Customers</UserTypeTitle>
            <UserTypeDescription>
              Order fuel and convenience store items. Track deliveries and manage your wallet.
            </UserTypeDescription>
            <UserTypeButton>Get Started</UserTypeButton>
          </UserTypeCard>
          
          <UserTypeCard as={Link} to="/driver/signup">
            <UserTypeIcon>
              <FaTruck />
            </UserTypeIcon>
            <UserTypeTitle>Drivers</UserTypeTitle>
            <UserTypeDescription>
              Earn money by delivering fuel. Access training, referrals, and earnings management.
            </UserTypeDescription>
            <UserTypeButton>Join as Driver</UserTypeButton>
          </UserTypeCard>
          
          <UserTypeCard as={Link} to="/station/signup">
            <UserTypeIcon>
              <FaStore />
            </UserTypeIcon>
            <UserTypeTitle>Stations</UserTypeTitle>
            <UserTypeDescription>
              Partner with us to reach more customers. Manage orders and inventory.
            </UserTypeDescription>
            <UserTypeButton>Partner with Us</UserTypeButton>
          </UserTypeCard>
        </UserTypesGrid>
      </UserTypesSection>

      {/* Footer */}
      <Footer>
        <FooterContent>
          <FooterSection>
            <FooterTitle>WeFuel</FooterTitle>
            <FooterText>
              Fueling Johannesburg, one delivery at a time.
            </FooterText>
          </FooterSection>
          
          <FooterSection>
            <FooterTitle>Quick Links</FooterTitle>
            <FooterLinks>
              <FooterLink as={Link} to="/user/login">Customer Login</FooterLink>
              <FooterLink as={Link} to="/driver/login">Driver Login</FooterLink>
              <FooterLink as={Link} to="/station/login">Station Login</FooterLink>
            </FooterLinks>
          </FooterSection>
          
          <FooterSection>
            <FooterTitle>Contact</FooterTitle>
            <FooterText>
              Email: support@wefuel.co.za<br />
              Phone: +27 11 123 4567
            </FooterText>
          </FooterSection>
        </FooterContent>
        
        <FooterBottom>
          <FooterText>&copy; 2024 WeFuel. All rights reserved.</FooterText>
        </FooterBottom>
      </Footer>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const HeroSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80vh;
  padding: 0 5%;
  color: white;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    padding: 2rem 5%;
  }
`;

const HeroContent = styled.div`
  flex: 1;
  max-width: 600px;
`;

const HeroTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 1.2;
  
  span {
    color: #ffd700;
  }
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
  line-height: 1.6;
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const PrimaryButton = styled.button`
  background: #ffd700;
  color: #333;
  padding: 1rem 2rem;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
  
  &:hover {
    background: #ffed4e;
    transform: translateY(-2px);
  }
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: white;
  padding: 1rem 2rem;
  border: 2px solid white;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
  
  &:hover {
    background: white;
    color: #333;
  }
`;

const HeroImage = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const GasPumpIcon = styled(FaGasPump)`
  font-size: 15rem;
  color: rgba(255, 255, 255, 0.2);
  
  @media (max-width: 768px) {
    font-size: 8rem;
    margin-top: 2rem;
  }
`;

const FeaturesSection = styled.section`
  padding: 5rem 5%;
  background: white;
`;

const SectionTitle = styled.h2`
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
  color: #333;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const FeatureCard = styled.div`
  text-align: center;
  padding: 2rem;
  border-radius: 15px;
  background: #f8f9fa;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  color: #667eea;
  margin-bottom: 1rem;
`;

const FeatureTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
`;

const FeatureDescription = styled.p`
  color: #666;
  line-height: 1.6;
`;

const UserTypesSection = styled.section`
  padding: 5rem 5%;
  background: #f8f9fa;
`;

const UserTypesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const UserTypeCard = styled.div`
  background: white;
  padding: 2.5rem;
  border-radius: 15px;
  text-align: center;
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
  }
`;

const UserTypeIcon = styled.div`
  font-size: 4rem;
  color: #667eea;
  margin-bottom: 1.5rem;
`;

const UserTypeTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
`;

const UserTypeDescription = styled.p`
  color: #666;
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const UserTypeButton = styled.button`
  background: #667eea;
  color: white;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #5a6fd8;
  }
`;

const Footer = styled.footer`
  background: #333;
  color: white;
  padding: 3rem 5% 1rem;
`;

const FooterContent = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const FooterSection = styled.div`
  margin-bottom: 2rem;
`;

const FooterTitle = styled.h4`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #ffd700;
`;

const FooterText = styled.p`
  color: #ccc;
  line-height: 1.6;
`;

const FooterLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FooterLink = styled(Link)`
  color: #ccc;
  text-decoration: none;
  transition: color 0.3s ease;
  
  &:hover {
    color: #ffd700;
  }
`;

const FooterBottom = styled.div`
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #555;
  margin-top: 2rem;
`;

export default LandingPage;
