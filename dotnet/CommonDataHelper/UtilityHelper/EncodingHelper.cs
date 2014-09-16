using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.UtilityHelper
{
    public static class EncodingHelper
    {
        public static string rawDecode(string input)
        {
            string output = string.Empty;

            int chr1, chr2, chr3;
            int enc1, enc2, enc3, enc4;
            var i = 0;

            System.Text.RegularExpressions.Regex rgx = new System.Text.RegularExpressions.Regex(@"/[^A-Za-z0-9\+\/\=]/g");
            input = rgx.Replace(input, "");

            string _keyStr = @"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

            while (i < input.Length)
            {
                enc1 = _keyStr.IndexOf(input[i++]);
                enc2 = _keyStr.IndexOf(input[i++]);
                enc3 = _keyStr.IndexOf(input[i++]);
                enc4 = _keyStr.IndexOf(input[i++]);

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + char.ConvertFromUtf32(chr1);

                if (enc3 != 64)
                {
                    output = output + char.ConvertFromUtf32(chr2);
                }
                if (enc4 != 64)
                {
                    output = output + char.ConvertFromUtf32(chr3);
                }
            }
            return output;
        }
    }
}
