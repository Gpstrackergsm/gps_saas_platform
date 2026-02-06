import unittest
from universal_gps_parser import UniversalGPSParser

class TestUniversalGPSParser(unittest.TestCase):
    
    def setUp(self):
        self.parser = UniversalGPSParser()

    def test_standard_data_valid(self):
        msg = "imei:1234567,tracker,230520120000,,F,120000,A,3124.5678,N,12124.5678,E,0.00,0,10.0,0,0,80%,80%,25;"
        result = self.parser.parse_message(msg)
        self.assertIsNotNone(result)
        self.assertEqual(result['type'], 'location_update')
        self.assertEqual(result['format'], 'standard')
        self.assertEqual(result['imei'], '1234567')
        self.assertEqual(result['gps_status'], 'F')
        # Check coordinate conversion
        # 3124.5678 -> 31 + 24.5678/60 = 31.409463
        self.assertAlmostEqual(result['latitude'], 31.4094633, places=4)
        # 12124.5678 -> 121 + 24.5678/60 = 121.409463
        self.assertAlmostEqual(result['longitude'], 121.4094633, places=4)
        self.assertEqual(result['fuel_tank1'], 80.0)

    def test_heartbeat_simple(self):
        msg = "123456789012345;"
        result = self.parser.parse_message(msg)
        self.assertIsNotNone(result)
        self.assertEqual(result['type'], 'heartbeat_simple')
        self.assertEqual(result['imei'], '123456789012345')

    def test_heartbeat_simple_no_semicolon(self):
        msg = "123456789012345"
        result = self.parser.parse_message(msg)
        self.assertIsNotNone(result)
        self.assertEqual(result['type'], 'heartbeat_simple')
        self.assertEqual(result['imei'], '123456789012345')

    def test_command_heartbeat(self):
        msg = "##,imei:359586018966098,A"
        result = self.parser.parse_message(msg)
        self.assertIsNotNone(result)
        self.assertEqual(result['type'], 'heartbeat_command')
        self.assertEqual(result['imei'], '359586018966098')
        self.assertEqual(result['status'], 'A')

    def test_hq_data(self):
        msg = "*HQ,359586018966098,V1,123519,A,3123.1234,N,00433.9876,E,0.08,0,231023,0,0,0,0,0,0,0,0#"
        result = self.parser.parse_message(msg)
        self.assertIsNotNone(result)
        self.assertEqual(result['type'], 'location_update')
        self.assertEqual(result['format'], 'hq')
        self.assertEqual(result['imei'], '359586018966098')
        self.assertEqual(result['timestamp'], '2023-10-23 12:35:19')
        self.assertAlmostEqual(result['speed'], 0.08)

    def test_invalid_message(self):
        self.assertIsNone(self.parser.parse_message(None))
        self.assertIsNone(self.parser.parse_message(""))
        self.assertIsNone(self.parser.parse_message("garbage_data"))

    def test_incomplete_standard_data(self):
        # Missing parts
        msg = "imei:1234567,tracker"
        self.assertIsNone(self.parser.parse_message(msg))

if __name__ == '__main__':
    unittest.main()
