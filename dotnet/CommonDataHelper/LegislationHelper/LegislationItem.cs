using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.LegislationHelper
{
    public class LegislationItem
    {
        private string _description;
        private string _code;

        public LegislationItem(string description, string code)
        {
            if (string.IsNullOrEmpty(description) && string.IsNullOrEmpty(code))
            {
                _description = description;
            }
            else
            {
                _description = code + ": " + description;
            }
            _code = code;
        }

        public string Description
        {
            get { return _description; }
        }

        public string Code
        {
            get { return _code; }
        }
    }
}
