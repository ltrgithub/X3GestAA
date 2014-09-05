using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.CompanyHelper
{
    public class CompanyItem
    {
        private string _cpynam;
        private string _cpy;

        public CompanyItem(string cpynam, string cpy)
        {
            if (cpynam.Equals(String.Empty) && cpy.Equals(String.Empty))
            {
                _cpynam = cpynam;
            }
            else
            {
                _cpynam = cpy + ": " + cpynam;
            }
            _cpy = cpy;
        }

        public string Cpynam
        {
            get { return _cpynam; }
        }

        public string Cpy
        {
            get { return _cpy; }
        }
    }
}
